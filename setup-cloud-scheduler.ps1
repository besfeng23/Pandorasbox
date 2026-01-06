# Script to set up Cloud Scheduler jobs for Firebase App Hosting
# Run this script to create the scheduled tasks

$APP_URL = "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app"
$LOCATION = "asia-southeast1"
$PROJECT_ID = "seismic-vista-480710-q5"

# Try to find gcloud
$gcloudPath = $null
$possiblePaths = @(
    "gcloud",
    "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "C:\Program Files\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:USERPROFILE\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
)

foreach ($path in $possiblePaths) {
    if ($path -eq "gcloud") {
        $cmd = Get-Command gcloud -ErrorAction SilentlyContinue
        if ($cmd) {
            $gcloudPath = "gcloud"
            break
        }
    } else {
        if (Test-Path $path) {
            $gcloudPath = $path
            break
        }
    }
}

if (-not $gcloudPath) {
    Write-Host "ERROR: gcloud CLI not found. Please install it or update the path in this script." -ForegroundColor Red
    exit 1
}

Write-Host "Using gcloud at: $gcloudPath" -ForegroundColor Green
Write-Host "App URL: $APP_URL" -ForegroundColor Green
Write-Host ""

# Enable Cloud Scheduler API if not already enabled
Write-Host "Enabling Cloud Scheduler API..." -ForegroundColor Yellow
& $gcloudPath services enable cloudscheduler.googleapis.com --project=$PROJECT_ID 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Cloud Scheduler API enabled" -ForegroundColor Green
    Write-Host "Waiting 30 seconds for API to propagate..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
} else {
    Write-Host "⚠ Cloud Scheduler API may already be enabled or failed to enable" -ForegroundColor Yellow
}

Write-Host ""

# Check if jobs already exist
Write-Host "Checking existing jobs..." -ForegroundColor Yellow
$existingJobs = & $gcloudPath scheduler jobs list --location=$LOCATION --format="value(name)" --project=$PROJECT_ID 2>&1

# Create cleanup job
if ($existingJobs -contains "projects/$PROJECT_ID/locations/$LOCATION/jobs/cleanup-old-data") {
    Write-Host "⚠ Cleanup job already exists, skipping..." -ForegroundColor Yellow
} else {
    Write-Host "Creating cleanup-old-data job..." -ForegroundColor Yellow
    $cleanupResult = & $gcloudPath scheduler jobs create http cleanup-old-data `
        --location=$LOCATION `
        --schedule="0 2 * * *" `
        --time-zone="UTC" `
        --uri="$APP_URL/api/cron/cleanup" `
        --http-method=POST `
        --description="Daily cleanup of old threads, memories, and history (90+ days)" `
        --project=$PROJECT_ID 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Cleanup job created successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create cleanup job: $cleanupResult" -ForegroundColor Red
    }
}

Write-Host ""

# Create daily briefing job
if ($existingJobs -contains "projects/$PROJECT_ID/locations/$LOCATION/jobs/daily-briefing") {
    Write-Host "⚠ Daily briefing job already exists, skipping..." -ForegroundColor Yellow
} else {
    Write-Host "Creating daily-briefing job..." -ForegroundColor Yellow
    $briefingResult = & $gcloudPath scheduler jobs create http daily-briefing `
        --location=$LOCATION `
        --schedule="0 13 * * *" `
        --time-zone="UTC" `
        --uri="$APP_URL/api/cron/daily-briefing" `
        --http-method=POST `
        --description="Daily morning briefing generation for all users (8 AM EST)" `
        --project=$PROJECT_ID 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Daily briefing job created successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create daily briefing job: $briefingResult" -ForegroundColor Red
    }
}

Write-Host ""

# Create nightly reflection job
if ($existingJobs -contains "projects/$PROJECT_ID/locations/$LOCATION/jobs/nightly-reflection") {
    Write-Host "⚠ Nightly reflection job already exists, skipping..." -ForegroundColor Yellow
} else {
    Write-Host "Creating nightly-reflection job..." -ForegroundColor Yellow
    $reflectionResult = & $gcloudPath scheduler jobs create http nightly-reflection `
        --location=$LOCATION `
        --schedule="0 3 * * *" `
        --time-zone="UTC" `
        --uri="$APP_URL/api/cron/nightly-reflection" `
        --http-method=POST `
        --description="Nightly reflection agent that analyzes user interactions and creates insight memories for offline learning" `
        --project=$PROJECT_ID 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Nightly reflection job created successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create nightly reflection job: $reflectionResult" -ForegroundColor Red
    }
}

Write-Host ""

# List all jobs
Write-Host "Current Cloud Scheduler jobs:" -ForegroundColor Cyan
& $gcloudPath scheduler jobs list --location=$LOCATION --format="table(name,schedule,timeZone,state)" --project=$PROJECT_ID 2>&1

Write-Host ""
Write-Host "Setup complete! Jobs are ready to run." -ForegroundColor Green
Write-Host "To test a job manually, run:" -ForegroundColor Yellow
Write-Host "  gcloud scheduler jobs run cleanup-old-data --location=$LOCATION" -ForegroundColor White
Write-Host "  gcloud scheduler jobs run daily-briefing --location=$LOCATION" -ForegroundColor White
Write-Host "  gcloud scheduler jobs run nightly-reflection --location=$LOCATION" -ForegroundColor White

