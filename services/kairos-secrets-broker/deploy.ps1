# Deploy Kairos Secrets Broker to Cloud Run
# Run from repo root

$ErrorActionPreference = "Stop"

# Set your constants
$PROJECT_ID = "seismic-vista-480710-q5"
$REGION = "asia-southeast1"
$REPO = "kairos"
$SERVICE_NAME = "kairos-secrets-broker"
$SERVICE_ACCOUNT = "${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com"

Write-Host "Deploying Kairos Secrets Broker" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID" -ForegroundColor Yellow
Write-Host "Region: $REGION" -ForegroundColor Yellow
Write-Host "Repository: $REPO" -ForegroundColor Yellow
Write-Host ""

# Check if gcloud is installed
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudPath) {
    Write-Host "ERROR: gcloud CLI not found. Please install Google Cloud SDK:" -ForegroundColor Red
    Write-Host "   https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Set project
Write-Host "Setting GCP project..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID

# 1) Enable APIs (idempotent)
Write-Host "Enabling required APIs..." -ForegroundColor Cyan
gcloud services enable `
  run.googleapis.com `
  secretmanager.googleapis.com `
  artifactregistry.googleapis.com `
  cloudbuild.googleapis.com `
  --quiet

# 2) Create service account (idempotent - will fail if exists, that's ok)
Write-Host "Creating service account..." -ForegroundColor Cyan
$saName = "${SERVICE_NAME}-sa"
$saEmail = "${SERVICE_ACCOUNT}"

# Temporarily change error action to continue, then restore
$oldErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
# Check if service account already exists
$existingSA = gcloud iam service-accounts describe $saEmail --project=$PROJECT_ID 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Service account already exists, continuing..." -ForegroundColor Yellow
} else {
    # Try to create it
    $createOutput = gcloud iam service-accounts create $saName `
      --display-name="Kairos Secrets Broker SA" `
      --description="Service account for Kairos Secrets Broker" `
      --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Service account created" -ForegroundColor Green
    } else {
        Write-Host "  Warning: Could not create service account (may already exist)" -ForegroundColor Yellow
        Write-Host "  Continuing anyway..." -ForegroundColor Yellow
    }
}
$ErrorActionPreference = $oldErrorAction

# 3) Check if bootstrap secret exists, create if not
Write-Host "Checking bootstrap secret..." -ForegroundColor Cyan
$bootstrapExists = gcloud secrets describe kairos-bootstrap-secret --project=$PROJECT_ID 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Bootstrap secret not found. Creating..." -ForegroundColor Yellow
    Write-Host "  Generating secure bootstrap secret..." -ForegroundColor Cyan
    
    # Generate a secure 64-byte random secret
    $bootstrapSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    $bootstrapSecret | gcloud secrets create kairos-bootstrap-secret --data-file=- --project=$PROJECT_ID
    
    Write-Host "  Bootstrap secret created" -ForegroundColor Green
    Write-Host "  IMPORTANT: Save this bootstrap secret securely!" -ForegroundColor Red
    Write-Host "  Bootstrap Secret: $bootstrapSecret" -ForegroundColor Yellow
    Write-Host "  Store this in Base44 as KAIROS_BOOTSTRAP_SECRET" -ForegroundColor Yellow
} else {
    Write-Host "  Bootstrap secret already exists" -ForegroundColor Green
}

# 4) Create Artifact Registry repo (idempotent)
Write-Host "Creating Artifact Registry repository..." -ForegroundColor Cyan
# Temporarily change error action to continue, then restore
$oldErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
# Check if repository already exists
$existingRepo = gcloud artifacts repositories describe $REPO --location=$REGION --project=$PROJECT_ID 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Repository already exists, continuing..." -ForegroundColor Yellow
} else {
    # Try to create it
    $createOutput = gcloud artifacts repositories create $REPO `
      --repository-format=docker `
      --location=$REGION `
      --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Repository created" -ForegroundColor Green
    } else {
        Write-Host "  Warning: Could not create repository (may already exist)" -ForegroundColor Yellow
        Write-Host "  Continuing anyway..." -ForegroundColor Yellow
    }
}
$ErrorActionPreference = $oldErrorAction

# 5) Build & push image
Write-Host "Building container image..." -ForegroundColor Cyan
$IMAGE_TAG = "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE_NAME}:latest"

# Build from service directory (gcloud builds submit expects Dockerfile in source root)
Push-Location "services/${SERVICE_NAME}"
gcloud builds submit `
  --tag $IMAGE_TAG `
  .
Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "  Image built and pushed" -ForegroundColor Green

# 6) Grant service account access to secrets
Write-Host "Granting Secret Manager access..." -ForegroundColor Cyan

$SECRETS = @(
    "kairos-bootstrap-secret",
    "linear-api-key",
    "tavily-api-key",
    "chatgpt-api-key",
    "openai-api-key"
)

$oldErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
foreach ($SECRET in $SECRETS) {
    Write-Host "  Granting access to: $SECRET" -ForegroundColor Gray
    $grantOutput = gcloud secrets add-iam-policy-binding $SECRET `
      --member="serviceAccount:${SERVICE_ACCOUNT}" `
      --role="roles/secretmanager.secretAccessor" `
      --quiet 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    Access granted" -ForegroundColor Green
    } else {
        Write-Host "    Secret not found or already has access" -ForegroundColor Yellow
    }
}
$ErrorActionPreference = $oldErrorAction

# 7) Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Cyan
gcloud run deploy $SERVICE_NAME `
  --image $IMAGE_TAG `
  --region $REGION `
  --service-account $SERVICE_ACCOUNT `
  --allow-unauthenticated `
  --set-secrets KAIROS_BOOTSTRAP_SECRET=kairos-bootstrap-secret:latest `
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID,NODE_ENV=production `
  --min-instances 0 `
  --max-instances 10 `
  --memory 512Mi `
  --cpu 1 `
  --timeout 30s `
  --platform managed

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed" -ForegroundColor Red
    exit 1
}

# 8) Get service URL
Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""

$SERVICE_URL = gcloud run services describe $SERVICE_NAME `
  --region $REGION `
  --format="value(status.url)"

Write-Host "Service URL: $SERVICE_URL" -ForegroundColor Cyan
Write-Host ""

# 9) Test health endpoint
Write-Host "Testing health endpoint..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-WebRequest -Uri "$SERVICE_URL/health" -Method GET -UseBasicParsing
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "  Health check passed" -ForegroundColor Green
        Write-Host "  Response: $($healthResponse.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Health check failed (service may still be starting)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Store KAIROS_BOOTSTRAP_SECRET in Base44 (if you created it above)" -ForegroundColor Yellow
Write-Host "  2. Store KAIROS_SECRETS_BROKER_URL=$SERVICE_URL in Base44" -ForegroundColor Yellow
Write-Host "  3. Use the Base44 client snippet from docs/12_SECRETS_SPINE.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Done! Your secrets broker is live at: $SERVICE_URL" -ForegroundColor Green
