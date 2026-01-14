# Setup Base44 secrets using Google Cloud SDK
# Uses the SDK at: C:\Program Files (x86)\Google\Cloud SDK

param(
    [string]$AppId = $env:BASE44_APP_ID,
    [string]$ApiKey = $env:BASE44_API_KEY,
    [string]$ProjectId = "seismic-vista-480710-q5",
    [string]$SdkPath = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
)

Write-Host "🔐 Setting up Base44 secrets in Google Cloud Secret Manager" -ForegroundColor Cyan
Write-Host "Project: $ProjectId" -ForegroundColor Yellow
Write-Host "SDK Path: $SdkPath" -ForegroundColor Yellow
Write-Host ""

# Check if SDK exists
if (-not (Test-Path $SdkPath)) {
    Write-Host "❌ Google Cloud SDK not found at: $SdkPath" -ForegroundColor Red
    Write-Host "   Trying system PATH..." -ForegroundColor Yellow
    
    $gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue
    if (-not $gcloudPath) {
        Write-Host "❌ gcloud CLI not found. Please install Google Cloud SDK." -ForegroundColor Red
        exit 1
    }
    $gcloudCmd = "gcloud"
} else {
    $gcloudCmd = "& `"$SdkPath`""
    Write-Host "✅ Google Cloud SDK found" -ForegroundColor Green
}

# Check if credentials are provided
if (-not $AppId -or -not $ApiKey) {
    Write-Host "❌ Missing credentials!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please provide credentials:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Set environment variables:" -ForegroundColor White
    Write-Host '  $env:BASE44_APP_ID="your_app_id"' -ForegroundColor Gray
    Write-Host '  $env:BASE44_API_KEY="your_api_key"' -ForegroundColor Gray
    Write-Host '  .\scripts\setup-base44-secrets-with-sdk.ps1' -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Pass as parameters:" -ForegroundColor White
    Write-Host '  .\scripts\setup-base44-secrets-with-sdk.ps1 -AppId "your_app_id" -ApiKey "your_key"' -ForegroundColor Gray
    Write-Host ""
    
    # Try to get from Base44 API URL if available
    $apiUrl = $env:BASE44_API_URL
    if ($apiUrl -and $apiUrl -match "kairostrack\.base44\.app") {
        Write-Host "💡 Found Base44 API URL: $apiUrl" -ForegroundColor Cyan
        Write-Host "   You can find your App ID in the Base44 dashboard:" -ForegroundColor White
        Write-Host "   - Go to Base44 dashboard → Settings → App Info" -ForegroundColor Gray
        Write-Host "   - Or check your API URL path: /api/apps/{APP_ID}/..." -ForegroundColor Gray
    }
    
    exit 1
}

Write-Host "✅ Credentials found" -ForegroundColor Green
Write-Host ""

# Secret 1: Base44 App ID
Write-Host "📝 Setting up base44-app-id secret..." -ForegroundColor Cyan
try {
    if ($gcloudCmd -eq "gcloud") {
        $secretExists = gcloud secrets describe base44-app-id --project=$ProjectId 2>&1
    } else {
        $secretExists = & $SdkPath secrets describe base44-app-id --project=$ProjectId 2>&1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Secret exists, adding new version..." -ForegroundColor Yellow
        if ($gcloudCmd -eq "gcloud") {
            echo $AppId | gcloud secrets versions add base44-app-id --data-file=- --project=$ProjectId
        } else {
            echo $AppId | & $SdkPath secrets versions add base44-app-id --data-file=- --project=$ProjectId
        }
    } else {
        Write-Host "  Creating new secret..." -ForegroundColor Yellow
        if ($gcloudCmd -eq "gcloud") {
            echo $AppId | gcloud secrets create base44-app-id --data-file=- --project=$ProjectId
        } else {
            echo $AppId | & $SdkPath secrets create base44-app-id --data-file=- --project=$ProjectId
        }
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
    if ($gcloudCmd -eq "gcloud") {
        $secretExists = gcloud secrets describe base44-api-key --project=$ProjectId 2>&1
    } else {
        $secretExists = & $SdkPath secrets describe base44-api-key --project=$ProjectId 2>&1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Secret exists, adding new version..." -ForegroundColor Yellow
        if ($gcloudCmd -eq "gcloud") {
            echo $ApiKey | gcloud secrets versions add base44-api-key --data-file=- --project=$ProjectId
        } else {
            echo $ApiKey | & $SdkPath secrets versions add base44-api-key --data-file=- --project=$ProjectId
        }
    } else {
        Write-Host "  Creating new secret..." -ForegroundColor Yellow
        if ($gcloudCmd -eq "gcloud") {
            echo $ApiKey | gcloud secrets create base44-api-key --data-file=- --project=$ProjectId
        } else {
            echo $ApiKey | & $SdkPath secrets create base44-api-key --data-file=- --project=$ProjectId
        }
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
Write-Host "1. Test the integration:" -ForegroundColor White
Write-Host "   npx tsx scripts/base44-sync.ts --verbose"
Write-Host ""
Write-Host "2. Grant access to service accounts (if needed):" -ForegroundColor White
Write-Host "   gcloud secrets add-iam-policy-binding base44-app-id --member='serviceAccount:YOUR_SA@$ProjectId.iam.gserviceaccount.com' --role='roles/secretmanager.secretAccessor'"
Write-Host "   gcloud secrets add-iam-policy-binding base44-api-key --member='serviceAccount:YOUR_SA@$ProjectId.iam.gserviceaccount.com' --role='roles/secretmanager.secretAccessor'"
Write-Host ""

