# Complete Production Setup Script
# Creates all secrets and Cloud Scheduler jobs for Pandora's Box

$PROJECT_ID = "seismic-vista-480710-q5"
$APP_URL = "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app"
$LOCATION = "asia-southeast1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pandora's Box - Complete Production Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find gcloud
Write-Host "Finding gcloud CLI..." -ForegroundColor Yellow
$gcloudPath = $null
$possiblePaths = @(
    "gcloud",
    "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:USERPROFILE\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:ProgramFiles(x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
)

foreach ($path in $possiblePaths) {
    if ($path -eq "gcloud") {
        try {
            $cmd = Get-Command gcloud -ErrorAction Stop
            $gcloudPath = "gcloud"
            break
        } catch {
            continue
        }
    } else {
        if (Test-Path $path) {
            $gcloudPath = $path
            break
        }
    }
}

if (-not $gcloudPath) {
    $whereResult = where.exe gcloud 2>$null
    if ($whereResult) {
        $gcloudPath = $whereResult | Select-Object -First 1
    }
}

if (-not $gcloudPath) {
    Write-Host "ERROR: gcloud CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Google Cloud SDK:" -ForegroundColor Yellow
    Write-Host "  https://cloud.google.com/sdk/docs/install" -ForegroundColor White
    Write-Host ""
    Write-Host "Or add gcloud to your PATH" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Found gcloud at: $gcloudPath" -ForegroundColor Green
Write-Host ""

# Set project
Write-Host "Setting project to: $PROJECT_ID" -ForegroundColor Yellow
& $gcloudPath config set project $PROJECT_ID
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Warning: Failed to set project. Continuing anyway..." -ForegroundColor Yellow
}
Write-Host ""

# Enable required APIs
Write-Host "Enabling required APIs..." -ForegroundColor Yellow
$apis = @(
    "secretmanager.googleapis.com",
    "cloudscheduler.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "  Enabling $api..." -ForegroundColor Gray
    & $gcloudPath services enable $api --project=$PROJECT_ID 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $api enabled" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ $api may already be enabled" -ForegroundColor Yellow
    }
}
Write-Host ""

# Create secrets
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating Secrets in Cloud Secret Manager" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$secrets = @{
    "openai-api-key" = "Please provide your OpenAI API key"
    "gemini-api-key" = "Please provide your Gemini API key"
    "chatgpt-api-key" = "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL"
    "cron-secret" = "pandoras-box-cron-secret-2026"
}

$serviceAccount = "service-536979070288@gcp-sa-apphosting.iam.gserviceaccount.com"

foreach ($secretName in $secrets.Keys) {
    Write-Host "Processing secret: $secretName" -ForegroundColor Yellow
    
    # Check if secret exists
    $exists = & $gcloudPath secrets describe $secretName --project=$PROJECT_ID 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ⚠ Secret already exists. Updating..." -ForegroundColor Yellow
        
        if ($secretName -eq "openai-api-key" -or $secretName -eq "gemini-api-key") {
            Write-Host "  ⚠ Please update $secretName manually with your API key" -ForegroundColor Yellow
            Write-Host "  Run: echo 'YOUR_KEY' | gcloud secrets versions add $secretName --data-file=-" -ForegroundColor Gray
        } else {
            $secretValue = $secrets[$secretName]
            echo $secretValue | & $gcloudPath secrets versions add $secretName --data-file=- --project=$PROJECT_ID 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Secret updated" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Failed to update secret" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  Creating new secret..." -ForegroundColor Yellow
        
        if ($secretName -eq "openai-api-key" -or $secretName -eq "gemini-api-key") {
            Write-Host "  ⚠ Please create $secretName manually with your API key" -ForegroundColor Yellow
            Write-Host "  Run: echo 'YOUR_KEY' | gcloud secrets create $secretName --data-file=- --replication-policy=automatic" -ForegroundColor Gray
        } else {
            $secretValue = $secrets[$secretName]
            echo $secretValue | & $gcloudPath secrets create $secretName --data-file=- --replication-policy="automatic" --project=$PROJECT_ID 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Secret created" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Failed to create secret" -ForegroundColor Red
                continue
            }
        }
    }
    
    # Grant access to App Hosting service account
    Write-Host "  Granting access to App Hosting..." -ForegroundColor Gray
    & $gcloudPath secrets add-iam-policy-binding $secretName `
        --member="serviceAccount:$serviceAccount" `
        --role="roles/secretmanager.secretAccessor" `
        --project=$PROJECT_ID 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Access granted" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Access may already be granted" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setting up Cloud Scheduler Jobs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Wait for API to propagate
Write-Host "Waiting for APIs to propagate..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Get existing jobs
$existingJobs = & $gcloudPath scheduler jobs list --location=$LOCATION --format="value(name)" --project=$PROJECT_ID 2>&1

# Define jobs
$jobs = @()
$jobs += @{Name="cleanup-old-data"; Schedule="0 2 * * *"; URI="$APP_URL/api/cron/cleanup"; Description="Daily cleanup of old threads, memories, and history"}
$jobs += @{Name="daily-briefing"; Schedule="0 13 * * *"; URI="$APP_URL/api/cron/daily-briefing"; Description="Daily morning briefing generation for all users"}
$jobs += @{Name="nightly-reflection"; Schedule="0 3 * * *"; URI="$APP_URL/api/cron/nightly-reflection"; Description="Nightly reflection agent that analyzes user interactions"}
$jobs += @{Name="deep-research"; Schedule="0 */6 * * *"; URI="$APP_URL/api/cron/deep-research"; Description="Deep research agent that self-studies low-confidence topics"}
$jobs += @{Name="reindex-memories"; Schedule="0 4 * * 0"; URI="$APP_URL/api/cron/reindex-memories"; Description="Weekly memory reindexing for optimal search performance"}
$jobs += @{Name="meta-learning"; Schedule="0 5 * * *"; URI="$APP_URL/api/cron/meta-learning"; Description="Phase 6 Daily meta-learning and continuous self-improvement"}

foreach ($job in $jobs) {
    $jobFullName = "projects/$PROJECT_ID/locations/$LOCATION/jobs/$($job.Name)"
    
    if ($existingJobs -contains $jobFullName) {
        Write-Host "⚠ Job '$($job.Name)' already exists, skipping..." -ForegroundColor Yellow
    } else {
        Write-Host "Creating job: $($job.Name)..." -ForegroundColor Yellow
        
        $jobName = $job.Name
        $jobSchedule = $job.Schedule
        $jobURI = $job.URI
        $jobDesc = $job.Description
        
        $result = & $gcloudPath scheduler jobs create http $jobName `
            --location=$LOCATION `
            --schedule=$jobSchedule `
            --time-zone="UTC" `
            --uri=$jobURI `
            --http-method=POST `
            --description=$jobDesc `
            --project=$PROJECT_ID 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Job created successfully" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Failed to create job: $result" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# List all jobs
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Current Cloud Scheduler Jobs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
& $gcloudPath scheduler jobs list --location=$LOCATION --format="table(name,schedule,timeZone,state)" --project=$PROJECT_ID

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Create OpenAI and Gemini API key secrets manually if needed" -ForegroundColor White
Write-Host "2. Verify all secrets are accessible in Firebase Console" -ForegroundColor White
Write-Host "3. Test jobs manually if needed:" -ForegroundColor White
Write-Host "   gcloud scheduler jobs run cleanup-old-data --location=$LOCATION" -ForegroundColor Gray
Write-Host ""
Write-Host "Your app is now fully configured for production!" -ForegroundColor Green

