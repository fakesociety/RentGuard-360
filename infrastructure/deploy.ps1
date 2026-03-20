# =============================================================================
# RentGuard 360 - Automated Deployment Script (PowerShell)
# =============================================================================
# This script deploys the entire RentGuard 360 infrastructure to a new AWS account
#
# Preferred usage (keeps secrets out of command history):
#   1) Copy infrastructure\config.env.template -> infrastructure\config.env
#   2) Fill values
#   3) Run: .\deploy.ps1
#
# Optional usage (overrides config.env):
#   .\deploy.ps1 -AzureEndpoint "https://..." -AzureKey "..." -Email "..."
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$ConfigFile,

    [Parameter(Mandatory=$false)]
    [string]$AzureEndpoint,

    [Parameter(Mandatory=$false)]
    [string]$AzureKey,

    [Parameter(Mandatory=$false)]
    [string]$Email,

    [Parameter(Mandatory=$false)]
    [string]$StackName,

    [Parameter(Mandatory=$false)]
    [string]$Environment,

    [Parameter(Mandatory=$false)]
    [string]$Region

    ,[Parameter(Mandatory=$false)]
    [string]$ProjectName

    ,[Parameter(Mandatory=$false)]
    [string]$NameSuffix
)

$ErrorActionPreference = "Stop"

function Get-EnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Map,
        [Parameter(Mandatory = $true)]
        [string]$Key
    )
    if (-not $Map.ContainsKey($Key)) { return $null }
    $value = [string]$Map[$Key]
    $value = $value.Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
    }

    return $value
}

function Read-ConfigEnv {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $map = @{}
    foreach ($line in (Get-Content -LiteralPath $Path)) {
        $trimmed = $line.Trim()
        if (-not $trimmed) { continue }
        if ($trimmed.StartsWith('#')) { continue }

        $m = [regex]::Match($trimmed, '^(?<k>[A-Za-z_][A-Za-z0-9_]*)=(?<v>.*)$')
        if (-not $m.Success) { continue }

        $k = $m.Groups['k'].Value
        $v = $m.Groups['v'].Value

        # Strip inline comments only when value is unquoted
        $vTrim = $v.Trim()
        if (-not ($vTrim.StartsWith('"') -or $vTrim.StartsWith("'"))) {
            $hashIndex = $v.IndexOf('#')
            if ($hashIndex -ge 0) {
                $v = $v.Substring(0, $hashIndex)
            }
        }

        $map[$k] = $v.Trim()
    }
    return $map
}

# Colors for output
function Write-Step { param($msg) Write-Host "`n🔷 $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "   $msg" -ForegroundColor Gray }

# =============================================================================
# STEP 0: Verify Prerequisites
# =============================================================================
Write-Step "Checking prerequisites..."

# Check AWS CLI
try {
    $awsVersion = aws --version 2>&1
    Write-Success "AWS CLI found: $awsVersion"
} catch {
    Write-Error "AWS CLI not found. Please install it first."
    exit 1
}

# Check AWS credentials
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    $AccountId = $identity.Account
    Write-Success "AWS Account: $AccountId"
    Write-Info "User: $($identity.Arn)"
} catch {
    Write-Error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
}

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$LambdaDir = Join-Path $ProjectRoot "backend\lambdas"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$DistDir = Join-Path $ScriptDir "dist"

Write-Info "Project root: $ProjectRoot"

# =============================================================================
# STEP 0.5: Load config.env (optional)
# =============================================================================
if (-not $ConfigFile) {
    $ConfigFile = Join-Path $ScriptDir "config.env"
}

$config = @{}
if (Test-Path -LiteralPath $ConfigFile) {
    Write-Step "Loading configuration from config.env..."

    # Safety: require STACK_NAME to be explicitly present in config.env unless overridden.
    if (-not $StackName) {
        $hasStackName = Select-String -LiteralPath $ConfigFile -Pattern '^\s*STACK_NAME\s*=' -Quiet
        if (-not $hasStackName) {
            Write-Error "STACK_NAME is missing in config.env"
            Write-Info "Add STACK_NAME explicitly (e.g., STACK_NAME=RentGuard360-Test) to avoid accidentally updating the main stack."
            exit 1
        }
    }

    $config = Read-ConfigEnv -Path $ConfigFile

    if (-not $AzureEndpoint) { $AzureEndpoint = Get-EnvValue -Map $config -Key 'AZURE_DOC_ENDPOINT' }
    if (-not $AzureKey) { $AzureKey = Get-EnvValue -Map $config -Key 'AZURE_DOC_KEY' }
    if (-not $Email) { $Email = Get-EnvValue -Map $config -Key 'SENDER_EMAIL' }
    if (-not $StackName) { $StackName = Get-EnvValue -Map $config -Key 'STACK_NAME' }
    if (-not $Environment) { $Environment = Get-EnvValue -Map $config -Key 'ENVIRONMENT' }
    if (-not $Region) { $Region = Get-EnvValue -Map $config -Key 'AWS_REGION' }
    if (-not $ProjectName) { $ProjectName = Get-EnvValue -Map $config -Key 'PROJECT_NAME' }
    if (-not $NameSuffix) { $NameSuffix = Get-EnvValue -Map $config -Key 'NAME_SUFFIX' }

    Write-Success "Loaded config.env"
} else {
    Write-Info "config.env not found at: $ConfigFile (continuing with parameters/defaults)"
}

if (-not $Email) { $Email = "rentguard360@gmail.com" }
if (-not $StackName) { $StackName = "RentGuard360" }
if (-not $Environment) { $Environment = "prod" }
if (-not $Region) { $Region = "us-east-1" }
if (-not $ProjectName) { $ProjectName = "RentGuard360" }
if (-not $NameSuffix) { $NameSuffix = "" }

# Safety: require explicit confirmation before deploying/updating the main stack.
if ($StackName -eq "RentGuard360" -and [string]::IsNullOrWhiteSpace($NameSuffix)) {
    Write-Host "" 
    Write-Host "⚠️  You are about to deploy/update the MAIN stack: $StackName (NameSuffix is empty)." -ForegroundColor Yellow
    Write-Host "⚠️  If you intended a test stack, set STACK_NAME=RentGuard360-Test and NAME_SUFFIX=-test in config.env." -ForegroundColor Yellow
    $confirm = Read-Host "Type DEPLOY_MAIN to continue"
    if ($confirm -ne "DEPLOY_MAIN") {
        Write-Error "Aborted to protect the main stack."
        exit 1
    }
}

# Ensure AWS CLI uses a consistent region (CloudFront is global, but the stack is regional)
$env:AWS_DEFAULT_REGION = $Region

if ($Region -ne "us-east-1") {
    Write-Info "Note: This stack includes CloudFront+WAF (CLOUDFRONT scope). Deployment is most reliable in us-east-1. Current: $Region"
}

if (-not $AzureEndpoint) {
    Write-Error "Azure endpoint is missing. Set AZURE_DOC_ENDPOINT in config.env or pass -AzureEndpoint."
    exit 1
}
if (-not $AzureKey) {
    Write-Error "Azure key is missing. Set AZURE_DOC_KEY in config.env or pass -AzureKey."
    exit 1
}

# =============================================================================
# STEP 1: Package Lambda Functions
# =============================================================================
Write-Step "Packaging Lambda functions..."

# Create dist directory
if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir | Out-Null
}

$ZipFile = Join-Path $DistDir "lambdas.zip"

# Remove old zip if exists
if (Test-Path $ZipFile) {
    Remove-Item $ZipFile -Force
}

# Get all Python files
$pythonFiles = Get-ChildItem -Path $LambdaDir -Filter "*.py"
$jsonFiles = Get-ChildItem -Path $LambdaDir -Filter "*.json"

Write-Info "Found $($pythonFiles.Count) Python files and $($jsonFiles.Count) JSON files"

# Create zip using PowerShell
$filesToZip = @()
$filesToZip += $pythonFiles.FullName
$filesToZip += $jsonFiles.FullName

Compress-Archive -Path $filesToZip -DestinationPath $ZipFile -Force

if (Test-Path $ZipFile) {
    $zipSize = (Get-Item $ZipFile).Length / 1KB
    Write-Success "Created lambdas.zip ($([math]::Round($zipSize, 2)) KB)"
} else {
    Write-Error "Failed to create lambdas.zip"
    exit 1
}

# =============================================================================
# STEP 2: Create Deployment S3 Bucket and Upload
# =============================================================================
Write-Step "Setting up deployment bucket..."

$DeploymentBucket = "rentguard-deployment-$AccountId"

# Check if bucket exists
$bucketExists = aws s3api head-bucket --bucket $DeploymentBucket 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Info "Creating bucket: $DeploymentBucket"
    aws s3 mb "s3://$DeploymentBucket" --region $Region
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create S3 bucket"
        exit 1
    }
    Write-Success "Bucket created"
} else {
    Write-Success "Bucket already exists"
}

# Upload Lambda zip
Write-Info "Uploading lambdas.zip..."
$LambdaCodeKey = "lambdas-$((Get-Date).ToString('yyyyMMddHHmmss')).zip"
aws s3 cp $ZipFile "s3://$DeploymentBucket/$LambdaCodeKey"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to upload to S3"
    exit 1
}
Write-Success "Uploaded Lambda code to S3: s3://$DeploymentBucket/$LambdaCodeKey"

# =============================================================================
# STEP 3: Deploy CloudFormation Stack
# =============================================================================
Write-Step "Deploying CloudFormation stack..."

$TemplateFile = Join-Path $ScriptDir "cloudformation.yaml"

if (-not (Test-Path -LiteralPath $TemplateFile)) {
    Write-Error "cloudformation.yaml not found at: $TemplateFile"
    exit 1
}

# CloudFormation has a 51,200 byte limit for TemplateBody.
# Upload the template to S3 and deploy via TemplateURL to avoid size issues.
Write-Info "Uploading CloudFormation template to S3 (avoids TemplateBody size limit)..."
$TemplateKey = "cloudformation-$((Get-Date).ToString('yyyyMMddHHmmss')).yaml"
aws s3 cp $TemplateFile "s3://$DeploymentBucket/$TemplateKey" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to upload CloudFormation template to S3"
    exit 1
}
$TemplateUrl = "https://s3.$Region.amazonaws.com/$DeploymentBucket/$TemplateKey"
Write-Info "Template URL: $TemplateUrl"

# Check if stack exists
$stackStatus = aws cloudformation describe-stacks --stack-name $StackName 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Info "Stack exists, updating..."
    $operation = "update-stack"
} else {
    Write-Info "Creating new stack..."
    $operation = "create-stack"
}

# Deploy stack
$deployCmd = @(
    "cloudformation", $operation,
    "--stack-name", $StackName,
    "--template-url", $TemplateUrl,
    "--capabilities", "CAPABILITY_NAMED_IAM",
    "--parameters",
    "ParameterKey=ProjectName,ParameterValue=$ProjectName",
    "ParameterKey=NameSuffix,ParameterValue=$NameSuffix",
    "ParameterKey=AzureDocEndpoint,ParameterValue=$AzureEndpoint",
    "ParameterKey=AzureDocKey,ParameterValue=$AzureKey",
    "ParameterKey=LambdaCodeBucket,ParameterValue=$DeploymentBucket",
    "ParameterKey=LambdaCodeKey,ParameterValue=$LambdaCodeKey",
    "ParameterKey=SenderEmail,ParameterValue=$Email",
    "ParameterKey=Environment,ParameterValue=$Environment"
)

& aws @deployCmd
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to deploy CloudFormation stack"
    exit 1
}

Write-Info "Waiting for stack to complete (this may take 10-15 minutes)..."

$waitOperation = if ($operation -eq "create-stack") { "stack-create-complete" } else { "stack-update-complete" }
aws cloudformation wait $waitOperation --stack-name $StackName

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  CloudFormation wait returned non-zero. Checking actual stack status..." -ForegroundColor Yellow
}

$stackStatusValue = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].StackStatus" --output text 2>$null
Write-Info "Stack status: $stackStatusValue"

if ($stackStatusValue -match 'IN_PROGRESS') {
    Write-Error "Stack is still in progress. Re-run this script in a few minutes to fetch outputs."
    exit 1
}
if ($stackStatusValue -match 'ROLLBACK' -or $stackStatusValue -match 'FAILED') {
    Write-Error "Stack deployment failed/rolled back. Showing recent events:"
    aws cloudformation describe-stack-events --stack-name $StackName --max-items 20 --output table 2>$null | Out-Host

    if ($stackStatusValue -eq 'ROLLBACK_COMPLETE') {
        Write-Host "" 
        Write-Host "⚠️  Stack is in ROLLBACK_COMPLETE and cannot be updated." -ForegroundColor Yellow
        Write-Host "⚠️  Delete it, wait for deletion to complete, then re-run this script:" -ForegroundColor Yellow
        Write-Host "    aws cloudformation delete-stack --stack-name $StackName" -ForegroundColor Yellow
        Write-Host "    aws cloudformation wait stack-delete-complete --stack-name $StackName" -ForegroundColor Yellow
    }
    exit 1
}

Write-Success "CloudFormation stack deployed successfully!"

# =============================================================================
# STEP 4: Get Stack Outputs
# =============================================================================
Write-Step "Retrieving stack outputs..."

$outputs = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs" --output json | ConvertFrom-Json

$ApiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiUrl" }).OutputValue
$UserPoolId = ($outputs | Where-Object { $_.OutputKey -eq "UserPoolId" }).OutputValue
$UserPoolClientId = ($outputs | Where-Object { $_.OutputKey -eq "UserPoolClientId" }).OutputValue
$FrontendBucket = ($outputs | Where-Object { $_.OutputKey -eq "FrontendBucketName" }).OutputValue
$ContractsBucket = ($outputs | Where-Object { $_.OutputKey -eq "ContractsBucketName" }).OutputValue
$CloudFrontDomain = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontDomainName" }).OutputValue

if ([string]::IsNullOrWhiteSpace($ApiUrl) -or [string]::IsNullOrWhiteSpace($CloudFrontDomain)) {
    Write-Error "Stack outputs are missing. The stack likely failed or hasn't finished yet."
    $stackStatusValue = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].StackStatus" --output text 2>$null
    Write-Info "Stack status: $stackStatusValue"
    aws cloudformation describe-stack-events --stack-name $StackName --max-items 20 --output table 2>$null | Out-Host

    if ($stackStatusValue -eq 'ROLLBACK_COMPLETE') {
        Write-Host "" 
        Write-Host "⚠️  Stack is in ROLLBACK_COMPLETE and cannot be updated." -ForegroundColor Yellow
        Write-Host "⚠️  Delete it, wait for deletion to complete, then re-run this script:" -ForegroundColor Yellow
        Write-Host "    aws cloudformation delete-stack --stack-name $StackName" -ForegroundColor Yellow
        Write-Host "    aws cloudformation wait stack-delete-complete --stack-name $StackName" -ForegroundColor Yellow
    }
    exit 1
}

Write-Success "Stack Outputs:"
Write-Info "API URL: $ApiUrl"
Write-Info "User Pool ID: $UserPoolId"
Write-Info "User Pool Client ID: $UserPoolClientId"
Write-Info "Frontend Bucket: $FrontendBucket"
Write-Info "Contracts Bucket: $ContractsBucket"
Write-Info "CloudFront Domain: https://$CloudFrontDomain"

# =============================================================================
# STEP 5: Update Frontend .env
# =============================================================================
Write-Step "Updating frontend configuration..."

$envFile = Join-Path $FrontendDir ".env"

# Preserve any previously configured values (OAuth domain/redirects, API key, etc.)
$existingEnv = @{}
if (Test-Path -LiteralPath $envFile) {
    try {
        $existingEnv = Read-ConfigEnv -Path $envFile
    } catch {
        Write-Info "Could not parse existing .env, continuing with fresh values"
    }
}

# Prefer existing values, then config.env, then derived defaults.
$checkUserApiKey = Get-EnvValue -Map $existingEnv -Key 'VITE_CHECK_USER_API_KEY'
if (-not $checkUserApiKey) {
    $checkUserApiKey = Get-EnvValue -Map $config -Key 'VITE_CHECK_USER_API_KEY'
}

if (-not $checkUserApiKey) {
    try {
        $apiKeyName = "$ProjectName-CheckUserKey$NameSuffix"
        $checkUserApiKey = aws apigateway get-api-keys --name-query $apiKeyName --include-values --query "items[0].value" --output text 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($checkUserApiKey) -or $checkUserApiKey -eq 'None') {
            $checkUserApiKey = ''
        }
    } catch {
        $checkUserApiKey = ''
    }
}

$oauthDomain = Get-EnvValue -Map $existingEnv -Key 'VITE_COGNITO_DOMAIN'
if (-not $oauthDomain) {
    $oauthDomain = Get-EnvValue -Map $config -Key 'VITE_COGNITO_DOMAIN'
}

$oauthRedirectIn = Get-EnvValue -Map $existingEnv -Key 'VITE_OAUTH_REDIRECT_URI'
if (-not $oauthRedirectIn) {
    $oauthRedirectIn = Get-EnvValue -Map $config -Key 'VITE_OAUTH_REDIRECT_URI'
}
if (-not $oauthRedirectIn) {
    $oauthRedirectIn = "https://$CloudFrontDomain/"
}

$oauthRedirectOut = Get-EnvValue -Map $existingEnv -Key 'VITE_OAUTH_REDIRECT_OUT_URI'
if (-not $oauthRedirectOut) {
    $oauthRedirectOut = Get-EnvValue -Map $config -Key 'VITE_OAUTH_REDIRECT_OUT_URI'
}
if (-not $oauthRedirectOut) {
    $oauthRedirectOut = $oauthRedirectIn
}

$envContent = @"
VITE_API_ENDPOINT=$ApiUrl
VITE_CHECK_USER_API_KEY=$checkUserApiKey
VITE_USER_POOL_ID=$UserPoolId
VITE_USER_POOL_CLIENT_ID=$UserPoolClientId
VITE_COGNITO_DOMAIN=$oauthDomain
VITE_OAUTH_REDIRECT_URI=$oauthRedirectIn
VITE_OAUTH_REDIRECT_OUT_URI=$oauthRedirectOut
VITE_AWS_REGION=$Region
VITE_S3_BUCKET=$ContractsBucket
"@

Set-Content -Path $envFile -Value $envContent
Write-Success "Updated .env file"

if (-not $checkUserApiKey) {
    Write-Host "⚠️  VITE_CHECK_USER_API_KEY is empty. check-user endpoint may fail until you set it." -ForegroundColor Yellow
}
if (-not $oauthDomain) {
    Write-Host "⚠️  VITE_COGNITO_DOMAIN is empty. Social login requires Cognito Hosted UI domain." -ForegroundColor Yellow
}

# =============================================================================
# STEP 6: Build and Deploy Frontend
# =============================================================================
Write-Step "Building frontend..."

Push-Location $FrontendDir

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Info "Installing dependencies..."
    npm install
}

# Build
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed"
    Pop-Location
    exit 1
}

Write-Success "Frontend built successfully"

# Upload to S3
Write-Info "Uploading to S3..."
aws s3 sync "dist/" "s3://$FrontendBucket/" --delete

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to upload frontend"
    Pop-Location
    exit 1
}

Pop-Location

Write-Success "Frontend deployed to S3"

# =============================================================================
# STEP 7: Invalidate CloudFront Cache
# =============================================================================
Write-Step "Invalidating CloudFront cache..."

$DistributionId = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontDistributionId" }).OutputValue

aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*" | Out-Null
Write-Success "Cache invalidation started"

# =============================================================================
# DONE!
# =============================================================================
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Your application is now live at:" -ForegroundColor White
Write-Host "  🌐 https://$CloudFrontDomain" -ForegroundColor Cyan
Write-Host ""
Write-Host "  API Endpoint:" -ForegroundColor White
Write-Host "  🔗 $ApiUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ⚠️  Don't forget to verify your SES email: $Email" -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
