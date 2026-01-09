# Production Setup Wrapper
# This script will guide you through setting up secrets and Cloud Scheduler

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pandora's Box - Production Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will help you set up:" -ForegroundColor Yellow
Write-Host "1. Secrets in Cloud Secret Manager" -ForegroundColor White
Write-Host "2. Cloud Scheduler jobs" -ForegroundColor White
Write-Host ""

# Try to find gcloud using multiple methods
$gcloudFound = $false
$gcloudPath = $null

# Method 1: Check PATH
try {
    $cmd = Get-Command gcloud -ErrorAction Stop
    $gcloudPath = "gcloud"
    $gcloudFound = $true
    Write-Host "✓ Found gcloud in PATH" -ForegroundColor Green
} catch {
    # Method 2: Check common installation paths
    $paths = @(
        "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
        "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
        "$env:USERPROFILE\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
        "${env:ProgramFiles(x86)}\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    )
    
    foreach ($path in $paths) {
        if (Test-Path $path) {
            $gcloudPath = $path
            $gcloudFound = $true
            Write-Host "✓ Found gcloud at: $path" -ForegroundColor Green
            break
        }
    }
    
    # Method 3: Use where.exe
    if (-not $gcloudFound) {
        $whereResult = where.exe gcloud 2>$null
        if ($whereResult) {
            $gcloudPath = $whereResult | Select-Object -First 1
            $gcloudFound = $true
            Write-Host "✓ Found gcloud via where.exe: $gcloudPath" -ForegroundColor Green
        }
    }
}

if (-not $gcloudFound) {
    Write-Host ""
    Write-Host "✗ gcloud CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Google Cloud SDK:" -ForegroundColor Yellow
    Write-Host "  https://cloud.google.com/sdk/docs/install" -ForegroundColor White
    Write-Host ""
    Write-Host "Or set up manually via Firebase Console:" -ForegroundColor Yellow
    Write-Host "  Secrets: https://console.cloud.google.com/security/secret-manager?project=seismic-vista-480710-q5" -ForegroundColor Cyan
    Write-Host "  Scheduler: https://console.cloud.google.com/cloudscheduler?project=seismic-vista-480710-q5" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Setting project..." -ForegroundColor Yellow
& $gcloudPath config set project seismic-vista-480710-q5
Write-Host ""

# Run secret creation
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 1: Creating Secrets" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "create-secret-now.ps1") {
    Write-Host "Running create-secret-now.ps1..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File "create-secret-now.ps1"
} else {
    Write-Host "Creating secrets manually..." -ForegroundColor Yellow
    
    # Create chatgpt-api-key (we have this value)
    $chatgptKey = "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL"
    Write-Host "Creating chatgpt-api-key..." -ForegroundColor Gray
    echo $chatgptKey | & $gcloudPath secrets create chatgpt-api-key --data-file=- --replication-policy=automatic 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        echo $chatgptKey | & $gcloudPath secrets versions add chatgpt-api-key --data-file=- 2>&1 | Out-Null
    }
    
    # Create cron-secret
    $cronSecret = "pandoras-box-cron-secret-2026"
    Write-Host "Creating cron-secret..." -ForegroundColor Gray
    echo $cronSecret | & $gcloudPath secrets create cron-secret --data-file=- --replication-policy=automatic 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        echo $cronSecret | & $gcloudPath secrets versions add cron-secret --data-file=- 2>&1 | Out-Null
    }
    
    Write-Host ""
    Write-Host "⚠ Please create these secrets manually with your API keys:" -ForegroundColor Yellow
    Write-Host "  - openai-api-key" -ForegroundColor White
    Write-Host "  - gemini-api-key" -ForegroundColor White
    Write-Host ""
    Write-Host "Run: echo 'YOUR_KEY' | gcloud secrets create SECRET_NAME --data-file=- --replication-policy=automatic" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2: Setting up Cloud Scheduler" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "setup-cloud-scheduler.ps1") {
    Write-Host "Running setup-cloud-scheduler.ps1..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File "setup-cloud-scheduler.ps1"
} else {
    Write-Host "Please run setup-cloud-scheduler.ps1 manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your app should be deploying automatically from GitHub." -ForegroundColor Green
Write-Host "Check Firebase Console for deployment status." -ForegroundColor Yellow

