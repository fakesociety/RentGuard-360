#!/bin/bash
# ==============================================================================
# RentGuard 360 - AWS CloudShell Deployment Script
# ==============================================================================
# This script deploys the entire RentGuard 360 infrastructure from CloudShell
# 
# Prerequisites:
# 1. Upload RentGuard360-Deployment.zip to CloudShell
# 2. Create config.env from config.env.template with your values
# 3. Run: chmod +x deploy-cloudshell.sh && ./deploy-cloudshell.sh
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_step() { echo -e "\n${CYAN}🔷 $1${NC}"; }
echo_success() { echo -e "${GREEN}✅ $1${NC}"; }
echo_error() { echo -e "${RED}❌ $1${NC}"; }
echo_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
echo_info() { echo -e "   $1"; }

# ==============================================================================
# STEP 0: Load Configuration
# ==============================================================================
echo_step "Loading configuration..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.env"

if [ ! -f "$CONFIG_FILE" ]; then
    echo_error "config.env not found!"
    echo_info "Please copy config.env.template to config.env and fill in the values"
    exit 1
fi

# Auto-fix Windows CRLF line endings if present (prevents: $'\r': command not found)
if grep -q $'\r' "$CONFIG_FILE" 2>/dev/null; then
    echo_warning "config.env has Windows line endings (CRLF). Converting to Unix (LF)..."
    sed -i 's/\r$//' "$CONFIG_FILE"
fi

# Source the config file
source "$CONFIG_FILE"

# Safety: require an explicit STACK_NAME entry in config.env.
# This prevents accidental deploys to the default main stack when the key is missing.
if ! grep -qE '^\s*STACK_NAME=' "$CONFIG_FILE"; then
    echo_error "STACK_NAME is missing in config.env"
    echo_info "Add STACK_NAME explicitly (e.g., STACK_NAME=RentGuard360-Test) to avoid accidentally updating the main stack."
    exit 1
fi

# Validate required values
if [ -z "$AZURE_DOC_ENDPOINT" ] || [ "$AZURE_DOC_ENDPOINT" = "https://your-resource-name.cognitiveservices.azure.com/" ]; then
    echo_error "AZURE_DOC_ENDPOINT not configured in config.env"
    exit 1
fi

if [ -z "$AZURE_DOC_KEY" ] || [ "$AZURE_DOC_KEY" = "your-azure-key-here" ]; then
    echo_error "AZURE_DOC_KEY not configured in config.env"
    exit 1
fi

if [ -z "$SENDER_EMAIL" ] || [ "$SENDER_EMAIL" = "your-email@example.com" ]; then
    echo_error "SENDER_EMAIL not configured in config.env"
    exit 1
fi

# Set defaults
STACK_NAME="${STACK_NAME:-RentGuard360}"
ENVIRONMENT="${ENVIRONMENT:-prod}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-RentGuard360}"
NAME_SUFFIX="${NAME_SUFFIX:-}"
STRIPE_API_URL="${STRIPE_API_URL:-}"
PAYMENT_INTERNAL_API_KEY="${PAYMENT_INTERNAL_API_KEY:-}"

if [ -z "$STRIPE_API_URL" ]; then
    echo_warning "STRIPE_API_URL is empty. Upload Lambda will reject uploads (subscription service not configured)."
fi

if [ -z "$PAYMENT_INTERNAL_API_KEY" ]; then
    echo_warning "PAYMENT_INTERNAL_API_KEY is empty. Upload Lambda cannot authenticate to Payment API deduct endpoint."
fi

if [ "$AWS_REGION" != "us-east-1" ]; then
    echo_warning "This stack includes CloudFront+WAF (CLOUDFRONT scope). Deployment is most reliable in us-east-1. Current: $AWS_REGION"
fi

echo_success "Configuration loaded"
echo_info "Stack Name: $STACK_NAME"
echo_info "Project Name: $PROJECT_NAME"
echo_info "Name Suffix: ${NAME_SUFFIX:-<empty>}"
echo_info "Environment: $ENVIRONMENT"
echo_info "Region: $AWS_REGION"

# Safety: require explicit confirmation before deploying/updating the main stack.
if [ "$STACK_NAME" = "RentGuard360" ] && [ -z "${NAME_SUFFIX:-}" ]; then
    echo_warning "You are about to deploy/update the MAIN stack: $STACK_NAME (NameSuffix is empty)."
    echo_warning "If you intended a test stack, set STACK_NAME=RentGuard360-Test and NAME_SUFFIX=-test in config.env."
    read -r -p "Type DEPLOY_MAIN to continue: " CONFIRM_MAIN
    if [ "$CONFIRM_MAIN" != "DEPLOY_MAIN" ]; then
        echo_error "Aborted to protect the main stack."
        exit 1
    fi
fi

# ==============================================================================
# STEP 1: Get AWS Account Info
# ==============================================================================
echo_step "Getting AWS account info..."

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo_success "AWS Account: $ACCOUNT_ID"

# ==============================================================================
# STEP 2: Create Deployment S3 Bucket
# ==============================================================================
echo_step "Setting up deployment bucket..."

DEPLOYMENT_BUCKET="rentguard-deployment-$ACCOUNT_ID"

# Check if bucket exists
if aws s3api head-bucket --bucket "$DEPLOYMENT_BUCKET" 2>/dev/null; then
    echo_success "Bucket already exists: $DEPLOYMENT_BUCKET"
else
    echo_info "Creating bucket: $DEPLOYMENT_BUCKET"
    aws s3 mb "s3://$DEPLOYMENT_BUCKET" --region "$AWS_REGION"
    echo_success "Bucket created"
fi

# ==============================================================================
# STEP 3: Upload Lambda Code
# ==============================================================================
echo_step "Uploading Lambda code..."

LAMBDA_ZIP="$SCRIPT_DIR/dist/lambdas.zip"

if [ ! -f "$LAMBDA_ZIP" ]; then
    # Try alternative path
    LAMBDA_ZIP="$SCRIPT_DIR/lambdas.zip"
fi

if [ ! -f "$LAMBDA_ZIP" ]; then
    echo_error "lambdas.zip not found!"
    echo_info "Expected location: $SCRIPT_DIR/dist/lambdas.zip"
    exit 1
fi

LAMBDA_CODE_KEY="lambdas-$(date +%Y%m%d%H%M%S).zip"
aws s3 cp "$LAMBDA_ZIP" "s3://$DEPLOYMENT_BUCKET/$LAMBDA_CODE_KEY"
echo_success "Uploaded Lambda code to S3: s3://$DEPLOYMENT_BUCKET/$LAMBDA_CODE_KEY"

# ==============================================================================
# STEP 4: Deploy CloudFormation Stack
# ==============================================================================
echo_step "Deploying CloudFormation stack..."

TEMPLATE_FILE="$SCRIPT_DIR/cloudformation.yaml"

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo_error "cloudformation.yaml not found!"
    exit 1
fi

# CloudFormation has a 51,200 byte limit for TemplateBody.
# Upload the template to S3 and deploy via TemplateURL to avoid size issues.
echo_info "Uploading CloudFormation template to S3 (avoids TemplateBody size limit)..."
TEMPLATE_KEY="cloudformation-$(date +%Y%m%d%H%M%S).yaml"
aws s3 cp "$TEMPLATE_FILE" "s3://$DEPLOYMENT_BUCKET/$TEMPLATE_KEY" > /dev/null
TEMPLATE_URL="https://s3.${AWS_REGION}.amazonaws.com/${DEPLOYMENT_BUCKET}/${TEMPLATE_KEY}"
echo_info "Template URL: $TEMPLATE_URL"

# Check if stack exists
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" 2>/dev/null; then
    echo_info "Stack exists, updating..."
    OPERATION="update-stack"
    WAIT_OPERATION="stack-update-complete"
else
    echo_info "Creating new stack..."
    OPERATION="create-stack"
    WAIT_OPERATION="stack-create-complete"
fi

# Deploy
aws cloudformation $OPERATION \
    --stack-name "$STACK_NAME" \
    --template-url "$TEMPLATE_URL" \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameters \
        ParameterKey=ProjectName,ParameterValue="$PROJECT_NAME" \
        ParameterKey=NameSuffix,ParameterValue="$NAME_SUFFIX" \
        ParameterKey=AzureDocEndpoint,ParameterValue="$AZURE_DOC_ENDPOINT" \
        ParameterKey=AzureDocKey,ParameterValue="$AZURE_DOC_KEY" \
        ParameterKey=LambdaCodeBucket,ParameterValue="$DEPLOYMENT_BUCKET" \
        ParameterKey=LambdaCodeKey,ParameterValue="$LAMBDA_CODE_KEY" \
        ParameterKey=SenderEmail,ParameterValue="$SENDER_EMAIL" \
        ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
        ParameterKey=StripeApiUrl,ParameterValue="$STRIPE_API_URL" \
        ParameterKey=PaymentInternalApiKey,ParameterValue="$PAYMENT_INTERNAL_API_KEY" \
    || {
        if [ "$OPERATION" = "update-stack" ]; then
            echo_warning "No updates to perform (stack is up to date)"
        else
            echo_error "Failed to deploy stack"
            exit 1
        fi
    }

echo_info "Waiting for stack to complete (this may take 10-15 minutes)..."
if ! aws cloudformation wait $WAIT_OPERATION --stack-name "$STACK_NAME"; then
        echo_warning "CloudFormation wait returned non-zero. Checking actual stack status..."
fi

STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "UNKNOWN")
echo_info "Stack status: $STACK_STATUS"

case "$STACK_STATUS" in
    *_IN_PROGRESS)
        echo_error "Stack is still in progress. Re-run this script in a few minutes to fetch outputs."
        exit 1
        ;;
    *ROLLBACK*|*_FAILED)
        echo_error "Stack deployment failed/rolled back. Showing recent events:"
        aws cloudformation describe-stack-events --stack-name "$STACK_NAME" --max-items 20 --output table || true

        if [ "$STACK_STATUS" = "ROLLBACK_COMPLETE" ]; then
            echo_warning "Stack is in ROLLBACK_COMPLETE and cannot be updated."
            echo_warning "Delete it, wait for deletion to complete, then re-run this script:"
            echo_info "aws cloudformation delete-stack --stack-name $STACK_NAME"
            echo_info "aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME"
        fi
        exit 1
        ;;
    *)
        echo_success "CloudFormation stack deployed!"
        ;;
esac

# ==============================================================================
# STEP 5: Get Stack Outputs
# ==============================================================================
echo_step "Retrieving stack outputs..."

get_output() {
    aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

API_URL=$(get_output "ApiUrl")
USER_POOL_ID=$(get_output "UserPoolId")
USER_POOL_CLIENT_ID=$(get_output "UserPoolClientId")
FRONTEND_BUCKET=$(get_output "FrontendBucketName")
CONTRACTS_BUCKET=$(get_output "ContractsBucketName")
CLOUDFRONT_DOMAIN=$(get_output "CloudFrontDomainName")
CLOUDFRONT_ID=$(get_output "CloudFrontDistributionId")

# Guard: if outputs are missing, the stack didn't complete successfully.
if [ -z "$API_URL" ] || [ "$API_URL" = "None" ] || [ -z "$CLOUDFRONT_DOMAIN" ] || [ "$CLOUDFRONT_DOMAIN" = "None" ]; then
    echo_error "Stack outputs are missing (got None). The stack likely failed or hasn't finished yet."
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "UNKNOWN")
    echo_info "Stack status: $STACK_STATUS"
    aws cloudformation describe-stack-events --stack-name "$STACK_NAME" --max-items 20 --output table || true

    if [ "$STACK_STATUS" = "ROLLBACK_COMPLETE" ]; then
        echo_warning "Stack is in ROLLBACK_COMPLETE and cannot be updated."
        echo_warning "Delete it, wait for deletion to complete, then re-run this script:"
        echo_info "aws cloudformation delete-stack --stack-name $STACK_NAME"
        echo_info "aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME"
    fi
    exit 1
fi

echo_success "Stack Outputs:"
echo_info "API URL: $API_URL"
echo_info "User Pool ID: $USER_POOL_ID"
echo_info "User Pool Client ID: $USER_POOL_CLIENT_ID"
echo_info "Frontend Bucket: $FRONTEND_BUCKET"
echo_info "Contracts Bucket: $CONTRACTS_BUCKET"
echo_info "CloudFront Domain: https://$CLOUDFRONT_DOMAIN"

# ==============================================================================
# STEP 6: Deploy Frontend (if dist folder exists)
# ==============================================================================
FRONTEND_DIST="$SCRIPT_DIR/../frontend/dist"

if [ -d "$FRONTEND_DIST" ]; then
    echo_step "Deploying frontend..."
    
    aws s3 sync "$FRONTEND_DIST/" "s3://$FRONTEND_BUCKET/" --delete
    echo_success "Frontend deployed to S3"
    
    # Invalidate CloudFront
    echo_info "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_ID" --paths "/*" > /dev/null
    echo_success "Cache invalidation started"
else
    echo_warning "Frontend dist folder not found - skipping frontend deployment"
    echo_info "Build frontend locally and upload to: s3://$FRONTEND_BUCKET/"
fi

# ==============================================================================
# DONE!
# ==============================================================================
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Your application is now live at:"
echo -e "  🌐 ${CYAN}https://$CLOUDFRONT_DOMAIN${NC}"
echo ""
echo "  API Endpoint:"
echo -e "  🔗 ${CYAN}$API_URL${NC}"
echo ""
echo "  Frontend .env values:"
echo "  ────────────────────────────────────────"
echo "  VITE_API_ENDPOINT=$API_URL"
echo "  VITE_USER_POOL_ID=$USER_POOL_ID"
echo "  VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID"
echo "  VITE_AWS_REGION=$AWS_REGION"
echo "  VITE_S3_BUCKET=$CONTRACTS_BUCKET"
echo "  ────────────────────────────────────────"
echo ""
echo -e "${YELLOW}  ⚠️  Don't forget to verify your SES email: $SENDER_EMAIL${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
