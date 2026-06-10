import * as fs from 'node:fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand
} from '@aws-sdk/lib-dynamodb';

const html = fs.readFileSync('index.html', 'utf8');

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

function dynamictable(html, tableQuery) {
    let table = '';

    if (tableQuery.Items && tableQuery.Items.length > 0) {
        for (const item of tableQuery.Items) {
            table += `<li>${JSON.stringify(item.form)}</li>`;
        }

        table = `<ul>${table}</ul>`;
    } else {
        table = '<p>No submissions yet.</p>';
    }

    return html.replace(
        '{table}',
        `<h4>DynamoDB:</h4>${table}`
    );
}

export const handler = async (event) => {
    try {
        const params = event.queryStringParameters || {};

        // Save form submission
        if (Object.keys(params).length > 0) {
            await dynamo.send(
                new PutCommand({
                    TableName: 'formStore',
                    Item: {
                        PK: 'form',
                        SK: event.requestContext.requestId,
                        form: params,
                        createdAt: new Date().toISOString()
                    }
                })
            );

            // Redirect to remove query string from URL
            return {
                statusCode: 302,
                headers: {
                    Location: event.requestContext.http?.path || '/'
                }
            };
        }

        // Load all saved submissions
        const tableQuery = await dynamo.send(
            new QueryCommand({
                TableName: 'formStore',
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: {
                    ':pk': 'form'
                }
            })
        );

        const modifiedHTML = dynamictable(html, tableQuery);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html'
            },
            body: modifiedHTML
        };
    } catch (err) {
        console.error('Lambda error:', err);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: err.message,
                name: err.name,
                stack: err.stack
            })
        };
    }
};