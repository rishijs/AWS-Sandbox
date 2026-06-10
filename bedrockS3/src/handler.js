const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')

const s3 = new S3Client()
// Bedrock client is optional for local testing; require lazily when needed
let BedrockRuntimeClient = null
let InvokeModelCommand = null
let bedrock = null

async function streamToString(stream) {
  return await new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

exports.handler = async (event) => {
  try {
    const bucket = process.env.BUCKET_NAME
    const key = (event.queryStringParameters && event.queryStringParameters.key) || 'input.txt'

    // Read input from S3
    let inputText = ''
    if (bucket) {
      const get = new GetObjectCommand({ Bucket: bucket, Key: key })
      const resp = await s3.send(get)
      inputText = await streamToString(resp.Body)
    } else {
      inputText = 'Hello from AWS Sandbox'
    }

    // Call Bedrock model (model id must be set in BEDROCK_MODEL_ID env var)
    const modelId = process.env.BEDROCK_MODEL_ID || ''
    let modelResult = null
    if (modelId) {
      try {
        const bedrockPkg = require('@aws-sdk/client-bedrock-runtime')
        BedrockRuntimeClient = bedrockPkg.BedrockRuntimeClient
        InvokeModelCommand = bedrockPkg.InvokeModelCommand
        bedrock = new BedrockRuntimeClient()
      } catch (e) {
        // SDK not installed locally — report and skip calling Bedrock
        modelResult = `bedrock-sdk-missing: ${e.message}`
      }

      if (bedrock && InvokeModelCommand) {
        const payload = { input: inputText }
        const cmd = new InvokeModelCommand({ modelId, contentType: 'application/json', accept: 'application/json', body: JSON.stringify(payload) })
        const out = await bedrock.send(cmd)
        if (out && out.body) {
          try {
            modelResult = await streamToString(out.body)
          } catch (e) {
            modelResult = String(out.body)
          }
        } else {
          modelResult = JSON.stringify(out)
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputText, modelResult })
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) }
  }
}
