# PowerShell script to create chatgpt-api-key secret
# This script will find gcloud and create the secret

Write-Host "Finding gcloud CLI..." -ForegroundColor Cyan

# Try to find gcloud
$gcloudPath = $null

# Check common locations
$possiblePaths = @(
    "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:USERPROFILE\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:ProgramFiles(x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $gcloudPath = $path
        Write-Host "Found gcloud at: $path" -ForegroundColor Green
        break
    }
}

# Try where.exe
if (-not $gcloudPath) {
    $whereResult = where.exe gcloud 2>$null
    if ($whereResult) {
        $gcloudPath = $whereResult | Select-Object -First 1
        Write-Host "Found gcloud via where.exe: $gcloudPath" -ForegroundColor Green
    }
}

# Try Get-Command
if (-not $gcloudPath) {
    try {
        $cmd = Get-Command gcloud -ErrorAction Stop
        $gcloudPath = $cmd.Source
        Write-Host "Found gcloud in PATH: $gcloudPath" -ForegroundColor Green
    } catch {
        Write-Host "gcloud not found in PATH" -ForegroundColor Yellow
    }
}

if (-not $gcloudPath) {
    Write-Host ""
    Write-Host "ERROR: gcloud CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please either:" -ForegroundColor Yellow
    Write-Host "1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install" -ForegroundColor White
    Write-Host "2. Add gcloud to your PATH" -ForegroundColor White
    Write-Host "3. Or create the secret manually via:" -ForegroundColor White
    Write-Host "   https://console.cloud.google.com/security/secret-manager/create?project=seismic-vista-480710-q5" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "Setting project..." -ForegroundColor Yellow
& $gcloudPath config set project seismic-vista-480710-q5

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to set project. Please run: gcloud auth login" -ForegroundColor Red
    exit 1
}

Write-Host "Creating secret: chatgpt-api-key..." -ForegroundColor Yellow
$apiKey = "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL"
echo $apiKey | & $gcloudPath secrets create chatgpt-api-key --data-file= --replication-policy="automatic"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Secret might already exist. Checking..." -ForegroundColor Yellow
    $exists = & $gcloudPath secrets describe chatgpt-api-key 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Secret already exists. Updating..." -ForegroundColor Yellow
        echo $apiKey | & $gcloudPath secrets versions add chatgpt-api-key --data-file=
    } else {
        Write-Host "Failed to create secret." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Granting access to App Hosting service account..." -ForegroundColor Yellow
& $gcloudPath secrets add-iam-policy-binding chatgpt-api-key `
  --member="serviceAccount:service-536979070288@gcp-sa-apphosting.iam.gserviceaccount.com" `
  --role="roles/secretmanager.secretAccessor"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Failed to grant access. You may need to do this manually in the console." -ForegroundColor Yellow
} else {
    Write-Host "Access granted successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Secret created successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The build should now succeed. Check Firebase Console for the build status." -ForegroundColor Yellow
Write-Host ""

