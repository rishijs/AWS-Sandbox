# AWS Sandbox

Minimal AWS SAM-based sandbox containing a single Lambda + API endpoint for quick experiments.

Prerequisites:
- AWS SAM CLI: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html
- Docker (for `sam local`): https://docs.docker.com/get-docker/

Quick start:

```bash
cd AWS-Sandbox
# build the function
npm run build
# start local API on http://localhost:3000
npm run local
# then in another shell:
curl http://localhost:3000/hello
```

Deploy to AWS (example):

```bash
# package/deploy steps using sam are documented in the SAM docs
sam deploy --guided
```

Files:
- `template.yaml` - SAM template defining the function + API
- `src/handler.js` - simple Lambda handler
- `package.json` - helper scripts
- `src/package.json` - function dependencies installed during `sam build`

Configuration:
- Set `BEDROCK_MODEL_ID` environment variable when deploying (e.g. `amazon.titan-text-001` or a private model id).
- The SAM template creates an S3 bucket referenced by `BUCKET_NAME`. Upload a sample `input.txt` to that bucket to have the function read it by default.

Example deploy-time override for model id:

```bash
sam deploy --parameter-overrides BedrockModelId=amazon.titan-text-001
```

Local testing with `sam local` will not call Bedrock unless you have network access and credentials configured. For quick local testing, omit the `BEDROCK_MODEL_ID` and the function will return a simple message.
