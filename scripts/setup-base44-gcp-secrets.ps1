# Setup Base44 secrets in Google Cloud Secret Manager
# Run this script to create the required secrets in GCP

$PROJECT_ID = if ($env:GOOGLE_CLOUD_PROJECT) { $env:GOOGLE_CLOUD_PROJECT } else { "seismic-vista-480710-q5" }

Write-Host "🔐 Setting up Base44 secrets in Google Cloud Secret Manager" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID" -ForegroundColor Yellow
Write-Host ""

# Check if gcloud is available
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudPath) {
    Write-Host "❌ gcloud CLI not found. Please install Google Cloud SDK." -ForegroundColor Red
    exit 1
}

Write-Host "✅ gcloud CLI found" -ForegroundColor Green
Write-Host ""

# Secret 1: Base44 App ID
Write-Host "📝 Setting up base44-app-id secret..." -ForegroundColor Cyan
$appId = Read-Host "Enter your Base44 App ID (e.g., 6962980527a433f05c114277)"

if ($appId) {
    # Check if secret exists
    $secretExists = gcloud secrets describe base44-app-id --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Secret exists, adding new version..." -ForegroundColor Yellow
        echo $appId | gcloud secrets versions add base44-app-id --data-file=- --project=$PROJECT_ID
    } else {
        Write-Host "  Creating new secret..." -ForegroundColor Yellow
        echo $appId | gcloud secrets create base44-app-id --data-file=- --project=$PROJECT_ID
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ base44-app-id secret created/updated" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Failed to create base44-app-id secret" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️  Skipping base44-app-id (empty input)" -ForegroundColor Yellow
}

Write-Host ""

# Secret 2: Base44 API Key
Write-Host "📝 Setting up base44-api-key secret..." -ForegroundColor Cyan
$apiKey = Read-Host "Enter your Base44 API Key" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey)
$plainApiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

if ($plainApiKey) {
    # Check if secret exists
    $secretExists = gcloud secrets describe base44-api-key --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Secret exists, adding new version..." -ForegroundColor Yellow
        echo $plainApiKey | gcloud secrets versions add base44-api-key --data-file=- --project=$PROJECT_ID
    } else {
        Write-Host "  Creating new secret..." -ForegroundColor Yellow
        echo $plainApiKey | gcloud secrets create base44-api-key --data-file=- --project=$PROJECT_ID
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ base44-api-key secret created/updated" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Failed to create base44-api-key secret" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️  Skipping base44-api-key (empty input)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Grant access to your service account:" -ForegroundColor White
Write-Host "   gcloud secrets add-iam-policy-binding base44-app-id --member='serviceAccount:YOUR_SA@$PROJECT_ID.iam.gserviceaccount.com' --role='roles/secretmanager.secretAccessor'"
Write-Host "   gcloud secrets add-iam-policy-binding base44-api-key --member='serviceAccount:YOUR_SA@$PROJECT_ID.iam.gserviceaccount.com' --role='roles/secretmanager.secretAccessor'"
Write-Host ""
Write-Host "2. Test the integration:" -ForegroundColor White
Write-Host "   npm run base44:test"

