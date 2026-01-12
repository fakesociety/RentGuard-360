\[DEPRECATED\] Use the root document: ../DEPLOYMENT_INSTRUCTIONS.md

This file is kept for historical reference. The deployment package ships only one document:
- DEPLOYMENT_INSTRUCTIONS.md

---

# RentGuard 360 - Deployment Guide

## 📋 Prerequisites

1. **AWS Account** with administrative access
2. **Azure Document Intelligence** resource (for OCR)
3. **AWS CLI** installed and configured (for local deployment)
4. **Node.js 18+** (for frontend build)

---

## 🚀 Quick Start (CloudShell)

### Step 1: Create Deployment Package (on your PC)
```batch
cd infrastructure
create-deployment-package.bat
```

### Step 2: Upload to CloudShell
1. Open AWS CloudShell in your browser
2. Click "Actions" → "Upload file"
3. Upload `infrastructure/dist/RentGuard360-Deployment.zip`

### Step 3: Deploy
```bash
# Unzip the package
unzip RentGuard360-Deployment.zip
cd infrastructure

# Create your config file
cp config.env.template config.env
nano config.env  # Edit with your values

# Run deployment
chmod +x deploy-cloudshell.sh
./deploy-cloudshell.sh
```

---

## 🔧 Configuration (config.env)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `AZURE_DOC_ENDPOINT` | Azure Document Intelligence URL | Azure Portal → Resource → Keys & Endpoint |
| `AZURE_DOC_KEY` | Azure API Key | Azure Portal → Resource → Keys & Endpoint |
| `SENDER_EMAIL` | Email for notifications | Must be verified in AWS SES |
| `STACK_NAME` | CloudFormation stack name | Default: `RentGuard360` |
| `ENVIRONMENT` | Environment tag | `dev`, `staging`, or `prod` |
| `AWS_REGION` | AWS region | Default: `us-east-1` |

---

## 📧 Verify SES Email

Before deployment, verify your sender email:

1. Go to AWS Console → SES → Verified Identities
2. Click "Create Identity"
3. Choose "Email address"
4. Enter your email and click "Create"
5. Check your inbox and click the verification link

> ⚠️ In SES sandbox mode, you can only send to verified emails

---

## 🖥️ Frontend Deployment

After CloudFormation deployment completes:

### Option A: Build locally and upload
```bash
# Get the values from CloudFormation outputs
cd frontend
cp .env.template .env
# Edit .env with values from deployment output

npm install
npm run build
aws s3 sync dist/ s3://rentguard360-frontend-XXXXXXXXXXXX/ --delete
```

### Option B: The deploy script does it for you
If you have the frontend `dist/` folder in the package, the CloudShell script will upload it automatically.

---

## 🔑 Create Admin User

After deployment:

```bash
# Get User Pool ID from outputs
USER_POOL_ID="us-east-1_XXXXXXXXX"

# Create admin user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com Name=email_verified,Value=true Name=name,Value="Admin User" \
  --message-action SUPPRESS \
  --temporary-password "TempPass123!"

# Set a permanent password (avoids relying on Cognito/SES emails)
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username admin@example.com \
  --password "YourPassword123!" \
  --permanent

# Add to Admins group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username admin@example.com \
  --group-name Admins
```

---

## 🔄 Updating the Stack

To update an existing deployment:

```bash
# Update Lambda code
aws s3 cp dist/lambdas.zip s3://rentguard-deployment-XXXXXXXXXXXX/

# Update CloudFormation
aws cloudformation update-stack \
  --stack-name RentGuard360 \
  --template-body file://cloudformation.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=AzureDocEndpoint,UsePreviousValue=true \
    ParameterKey=AzureDocKey,UsePreviousValue=true \
    ParameterKey=LambdaCodeBucket,UsePreviousValue=true \
    ParameterKey=SenderEmail,UsePreviousValue=true

# Wait for completion
aws cloudformation wait stack-update-complete --stack-name RentGuard360
```

---

## 🗑️ Cleanup (Delete Everything)

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Empty S3 buckets first
aws s3 rm s3://rentguard360-frontend-$ACCOUNT_ID --recursive
aws s3 rm s3://rentguard360-contracts-$ACCOUNT_ID --recursive

# Delete the stack
aws cloudformation delete-stack --stack-name RentGuard360
aws cloudformation wait stack-delete-complete --stack-name RentGuard360

# Delete deployment bucket
aws s3 rb s3://rentguard-deployment-$ACCOUNT_ID --force
```

---

## ❓ Troubleshooting

### CORS Errors
- All OPTIONS methods are configured in the template
- If still seeing CORS errors, redeploy the API Gateway stage

### Lambda Timeout
- AI Analyzer has 12min timeout
- If still timing out, check CloudWatch logs

### SES Not Sending
- Verify sender email in SES
- Check if in sandbox mode (only verified recipients)
- Request production access if needed

### CloudFront 403
- Wait 15 minutes for distribution to deploy
- Check S3 bucket policy allows CloudFront OAC

---

## 📚 Architecture

```
User → CloudFront → S3 (Frontend)
     → API Gateway → Lambda → DynamoDB
                             → S3 (Contracts)
                             → Cognito
                             → Azure OCR
                             → Bedrock AI

S3 Upload → EventBridge → Step Functions:
  1. Azure OCR
  2. Privacy Shield
  3. AI Analyzer
  4. Save Results
  5. Notify User
```
