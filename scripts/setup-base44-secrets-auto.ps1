# Setup Base44 secrets in Google Cloud Secret Manager (Auto-detect from env vars)
# Usage: 
#   Option 1: Set env vars first, then run:
#     $env:BASE44_APP_ID="your_app_id"; $env:BASE44_API_KEY="your_key"; .\scripts\setup-base44-secrets-auto.ps1
#   Option 2: Pass as parameters:
#     .\scripts\setup-base44-secrets-auto.ps1 -AppId "your_app_id" -ApiKey "your_key"

param(
    [string]$AppId = $env:BASE44_APP_ID,
    [string]$ApiKey = $env:BASE44_API_KEY,
    [string]$ProjectId = "seismic-vista-480710-q5"
)

Write-Host "🔐 Setting up Base44 secrets in Google Cloud Secret Manager" -ForegroundColor Cyan
Write-Host "Project: $ProjectId" -ForegroundColor Yellow
Write-Host ""

# Check if credentials are provided
if (-not $AppId -or -not $ApiKey) {
    Write-Host "❌ Missing credentials!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please provide credentials in one of these ways:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Set environment variables:" -ForegroundColor White
    Write-Host '  $env:BASE44_APP_ID="your_app_id"' -ForegroundColor Gray
    Write-Host '  $env:BASE44_API_KEY="your_api_key"' -ForegroundColor Gray
    Write-Host '  .\scripts\setup-base44-secrets-auto.ps1' -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Pass as parameters:" -ForegroundColor White
    Write-Host '  .\scripts\setup-base44-secrets-auto.ps1 -AppId "your_app_id" -ApiKey "your_key"' -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 3: Use the interactive script:" -ForegroundColor White
    Write-Host '  .\scripts\setup-base44-gcp-secrets.ps1' -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Check if gcloud is available
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudPath) {
    Write-Host "❌ gcloud CLI not found. Please install Google Cloud SDK." -ForegroundColor Red
    exit 1
}

Write-Host "✅ gcloud CLI found" -ForegroundColor Green
Write-Host "✅ Credentials found" -ForegroundColor Green
Write-Host ""

# Secret 1: Base44 App ID
Write-Host "📝 Setting up base44-app-id secret..." -ForegroundColor Cyan
try {
    $secretExists = gcloud secrets describe base44-app-id --project=$ProjectId 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Secret exists, adding new version..." -ForegroundColor Yellow
        echo $AppId | gcloud secrets versions add base44-app-id --data-file=- --project=$ProjectId
    } else {
        Write-Host "  Creating new secret..." -ForegroundColor Yellow
        echo $AppId | gcloud secrets create base44-app-id --data-file=- --project=$ProjectId
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ base44-app-id secret created/updated" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Failed to create base44-app-id secret" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ❌ Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Secret 2: Base44 API Key
Write-Host "📝 Setting up base44-api-key secret..." -ForegroundColor Cyan
try {
    $secretExists = gcloud secrets describe base44-api-key --project=$ProjectId 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Secret exists, adding new version..." -ForegroundColor Yellow
        echo $ApiKey | gcloud secrets versions add base44-api-key --data-file=- --project=$ProjectId
    } else {
        Write-Host "  Creating new secret..." -ForegroundColor Yellow
        echo $ApiKey | gcloud secrets create base44-api-key --data-file=- --project=$ProjectId
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ base44-api-key secret created/updated" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Failed to create base44-api-key secret" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ❌ Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Grant access to service accounts that need these secrets:" -ForegroundColor White
Write-Host "   gcloud secrets add-iam-policy-binding base44-app-id --member='serviceAccount:YOUR_SA@$ProjectId.iam.gserviceaccount.com' --role='roles/secretmanager.secretAccessor'"
Write-Host "   gcloud secrets add-iam-policy-binding base44-api-key --member='serviceAccount:YOUR_SA@$ProjectId.iam.gserviceaccount.com' --role='roles/secretmanager.secretAccessor'"
Write-Host ""
Write-Host "2. Test the integration:" -ForegroundColor White
Write-Host "   npm run base44:test"
Write-Host ""

