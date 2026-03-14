
# RentGuard 360 — Installation (Clean AWS Account)

This is the single installation document for RentGuard 360.
It is written for a fresh AWS account and a recipient who should be able to deploy without prior project context.

**⚠️ Important:** This project requires an **AWS Academy 6-month account** (or equivalent) with **Amazon Bedrock** enabled. Standard AWS Academy sandbox accounts do not have Bedrock access.

## Submission contents (requirements 9–10)
The submission includes:

1) GitHub repository link: `https://github.com/fakesociety/RentGuard360.git` — full source code with history (requirement 9)
2) `RentGuard360-Deployment.zip` — deploy-ready bundle (contains `lambdas.zip`, `cloudformation.yaml`, deploy scripts)
3) `config.env.template` — configuration template (provided separately)
4) `AzureCredentials.txt` — separate text file with `AZURE_DOC_ENDPOINT` and `AZURE_DOC_KEY`

Note: The GitHub repository contains all Lambda source files (`backend/lambdas/*.py`). The API definition (Swagger) is included in `RentGuard360-Deployment.zip` under `backend/api-gateway/`.

## Prerequisites
- AWS account permissions to create: CloudFormation, IAM, S3, CloudFront, WAFv2, API Gateway, Cognito, DynamoDB, Step Functions, EventBridge
- AWS CloudShell (recommended)
- AWS CLI configured locally (required to build frontend and run CloudFormation queries)
- Node.js 18+ (required to build the frontend locally)
- Azure Document Intelligence (Endpoint + Key) from `AzureCredentials.txt`
- AWS SES: verified sender email (`SENDER_EMAIL`)
- Amazon Bedrock: Claude model access enabled in your AWS account (us-east-1)

## Deploy (AWS CloudShell) — from `RentGuard360-Deployment.zip`

### 1) Upload and extract
Upload `RentGuard360-Deployment.zip` into CloudShell, then:

```bash
rm -rf ~/infrastructure ~/frontend ~/backend ~/docs ~/DEPLOYMENT_INSTRUCTIONS.md 2>/dev/null || true
unzip -o RentGuard360-Deployment.zip
```

### 2) Create `infrastructure/config.env`

**Option A (recommended):** 
1. On your computer: copy `config.env.template` → rename to `config.env` → edit and fill values
2. Upload the edited `config.env` to CloudShell
3. Move it into place:

```bash
cd infrastructure
mv -f ~/config.env ./config.env
```

**Option B:** Upload the blank template to CloudShell and edit there:

```bash
cd infrastructure
mv -f ~/config.env.template ./config.env.template
cp -f config.env.template config.env
nano config.env
```

Set these values:
- `AZURE_DOC_ENDPOINT` (from `AzureCredentials.txt`)
- `AZURE_DOC_KEY` (from `AzureCredentials.txt`)
- `SENDER_EMAIL` (must be verified in AWS SES)
- `STACK_NAME="RentGuard360"` (or `"RentGuard360-Test"` for testing)
- `NAME_SUFFIX=""` (or `"-test"` for testing)

Safety note: Deploying the main stack (`STACK_NAME="RentGuard360"` with empty `NAME_SUFFIX`) requires typing `DEPLOY_MAIN` when prompted.

### 3) Run deploy

```bash
chmod +x deploy-cloudshell.sh
./deploy-cloudshell.sh
```

At the end of a successful run, the script prints the key CloudFormation outputs required for the frontend (API URL, user pool IDs, buckets, CloudFront domain).

## Frontend deployment (build from the Git repo)
Clone the repository locally, build the frontend, then upload to the stack's frontend bucket.

### 1) Clone the repository

```bash
git clone https://github.com/fakesociety/RentGuard360.git
cd RentGuard360/frontend
```

### 2) Create `frontend/.env`

```bash
cp .env.template .env
```

Values can be copied from the deploy script output, or retrieved from CloudFormation:

```bash
STACK_NAME=RentGuard360

API_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
CONTRACTS_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ContractsBucketName'].OutputValue" --output text)

echo "VITE_API_ENDPOINT=$API_URL" > .env
echo "VITE_USER_POOL_ID=$USER_POOL_ID" >> .env
echo "VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID" >> .env
echo "VITE_AWS_REGION=us-east-1" >> .env
echo "VITE_S3_BUCKET=$CONTRACTS_BUCKET" >> .env
```

### 3) Build and upload

```bash
npm install
npm run build

FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text)
aws s3 sync dist/ "s3://$FRONTEND_BUCKET/" --delete
```

### 4) CloudFront invalidation (recommended)

```bash
DIST_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

## Create an admin user (Cognito)

```bash
STACK_NAME=RentGuard360
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)

aws cognito-idp admin-create-user \
	--user-pool-id "$USER_POOL_ID" \
	--username your-email@example.com \
	--user-attributes Name=email,Value=your-email@example.com Name=email_verified,Value=true \
	--message-action SUPPRESS \
	--temporary-password "TempPass123!"

aws cognito-idp admin-set-user-password \
	--user-pool-id "$USER_POOL_ID" \
	--username your-email@example.com \
	--password "YourPassword123!" \
	--permanent

aws cognito-idp admin-add-user-to-group \
	--user-pool-id "$USER_POOL_ID" \
	--username your-email@example.com \
	--group-name Admins
```

## Minimal verification (post-deploy)
1) Open the CloudFront URL printed by the deploy script.
2) Sign up -> confirm email -> upload a PDF.
3) Log in as admin and open the Admin dashboard.

## Troubleshooting (only the common blockers)
- CloudShell `$'\r': command not found` -> run `sed -i 's/\r$//' config.env`
- SES sandbox blocks email delivery -> verify `SENDER_EMAIL` in SES (and recipients if needed)
- Upload CORS errors -> ensure the stack was updated with the latest `cloudformation.yaml`

