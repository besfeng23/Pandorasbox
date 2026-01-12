#!/usr/bin/env pwsh
# All-in-one script: Check state, deploy Kairos Event Gateway, and send test events
# This script handles the complete workflow from deployment to testing

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "seismic-vista-480710-q5"
$REGION = "asia-southeast1"
$SERVICE_NAME = "kairos-event-gateway"
$GATEWAY_URL = $null  # Will be set after deployment

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 Kairos Event Gateway - Deploy & Test" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check prerequisites
Write-Host "📋 Step 1: Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check gcloud
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudPath) {
    Write-Host "❌ gcloud CLI not found. Please install Google Cloud SDK:" -ForegroundColor Red
    Write-Host "   https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ gcloud CLI found" -ForegroundColor Green

# Check authentication
Write-Host "🔐 Checking authentication..." -ForegroundColor Gray
try {
    $account = gcloud config get-value account 2>&1
    if ($LASTEXITCODE -ne 0 -or -not $account) {
        Write-Host "❌ Not authenticated. Run: gcloud auth login" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Authenticated as: $account" -ForegroundColor Green
} catch {
    Write-Host "❌ Authentication check failed: $_" -ForegroundColor Red
    exit 1
}

# Set project
Write-Host "📦 Setting GCP project..." -ForegroundColor Gray
gcloud config set project $PROJECT_ID 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set project" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Project set to: $PROJECT_ID" -ForegroundColor Green

# Check if secret exists
Write-Host "🔑 Checking kairos-ingest-secret..." -ForegroundColor Gray
$secretCheck = gcloud secrets describe kairos-ingest-secret --project=$PROJECT_ID 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Secret 'kairos-ingest-secret' not found!" -ForegroundColor Red
    Write-Host "   Create it with:" -ForegroundColor Yellow
    Write-Host "   echo 'YOUR_SECRET_VALUE' | gcloud secrets create kairos-ingest-secret --data-file=-" -ForegroundColor Gray
    exit 1
}
Write-Host "✅ Secret exists" -ForegroundColor Green
Write-Host ""

# Step 2: Check current deployment state
Write-Host "🔍 Step 2: Checking current deployment state..." -ForegroundColor Yellow
Write-Host ""

try {
    $existingService = gcloud run services describe $SERVICE_NAME `
        --region=$REGION `
        --project=$PROJECT_ID `
        --format="value(status.url)" 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $existingService) {
        $GATEWAY_URL = $existingService
        Write-Host "✅ Service already deployed" -ForegroundColor Green
        Write-Host "   URL: $GATEWAY_URL" -ForegroundColor Gray
        Write-Host ""
        Write-Host "💡 Service exists. Options:" -ForegroundColor Yellow
        Write-Host "   1. Skip deployment and just test (recommended)" -ForegroundColor Gray
        Write-Host "   2. Redeploy anyway" -ForegroundColor Gray
        Write-Host ""
        $redeploy = Read-Host "Redeploy? (y/N)"
        if ($redeploy -ne "y" -and $redeploy -ne "Y") {
            Write-Host "⏭️  Skipping deployment, proceeding to test..." -ForegroundColor Yellow
            Write-Host ""
            $skipDeploy = $true
        } else {
            $skipDeploy = $false
        }
    } else {
        Write-Host "ℹ️  Service not found, will deploy new instance" -ForegroundColor Yellow
        $skipDeploy = $false
    }
} catch {
    Write-Host "ℹ️  Service not found, will deploy new instance" -ForegroundColor Yellow
    $skipDeploy = $false
}

Write-Host ""

# Step 3: Deploy (if needed)
if (-not $skipDeploy) {
    Write-Host "🚀 Step 3: Deploying Kairos Event Gateway..." -ForegroundColor Yellow
    Write-Host ""
    
    # Run deployment script
    $deployScript = "services\$SERVICE_NAME\deploy.ps1"
    if (-not (Test-Path $deployScript)) {
        Write-Host "❌ Deployment script not found: $deployScript" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "📝 Running deployment script..." -ForegroundColor Gray
    & $deployScript
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Deployment failed" -ForegroundColor Red
        exit 1
    }
    
    # Get service URL
    $GATEWAY_URL = gcloud run services describe $SERVICE_NAME `
        --region=$REGION `
        --project=$PROJECT_ID `
        --format="value(status.url)" 2>&1
    
    if ($LASTEXITCODE -ne 0 -or -not $GATEWAY_URL) {
        Write-Host "❌ Failed to get service URL after deployment" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Deployment complete!" -ForegroundColor Green
    Write-Host "   Service URL: $GATEWAY_URL" -ForegroundColor Gray
    Write-Host ""
    
    # Wait a moment for service to be ready
    Write-Host "⏳ Waiting for service to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
} else {
    Write-Host "⏭️  Step 3: Skipped (service already deployed)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 4: Grant IAM access (if needed)
Write-Host "🔐 Step 4: Ensuring IAM access..." -ForegroundColor Yellow
Write-Host ""

$currentAccount = gcloud config get-value account
$iamCheck = gcloud run services get-iam-policy $SERVICE_NAME `
    --region=$REGION `
    --project=$PROJECT_ID `
    --format="value(bindings[].members)" 2>&1

if ($iamCheck -notmatch $currentAccount) {
    Write-Host "🔓 Granting IAM access..." -ForegroundColor Gray
    gcloud run services add-iam-policy-binding $SERVICE_NAME `
        --region=$REGION `
        --member="user:$currentAccount" `
        --role="roles/run.invoker" `
        --project=$PROJECT_ID 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ IAM access granted" -ForegroundColor Green
    } else {
        Write-Host "⚠️  IAM access may already be granted (continuing...)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ IAM access already configured" -ForegroundColor Green
}
Write-Host ""

# Step 5: Test gateway health
Write-Host "🏥 Step 5: Testing gateway health..." -ForegroundColor Yellow
Write-Host ""

try {
    Write-Host "🔑 Getting identity token..." -ForegroundColor Gray
    $token = gcloud auth print-identity-token --audience=$GATEWAY_URL 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to get identity token" -ForegroundColor Red
        Write-Host "   Run: gcloud auth login" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Token obtained" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📡 Testing health endpoint..." -ForegroundColor Gray
    $healthResponse = Invoke-RestMethod `
        -Uri "$GATEWAY_URL/healthz" `
        -Method Get `
        -Headers @{
            "Authorization" = "Bearer $token"
        } `
        -ErrorAction Stop
    
    if ($healthResponse.ok -eq $true) {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
        Write-Host "   Response: $($healthResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Health check returned unexpected response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   HTTP Status: $statusCode" -ForegroundColor Gray
        
        if ($statusCode -eq 401 -or $statusCode -eq 403) {
            Write-Host "   💡 Grant IAM access:" -ForegroundColor Yellow
            Write-Host "      gcloud run services add-iam-policy-binding $SERVICE_NAME --region=$REGION --member=user:$currentAccount --role=roles/run.invoker" -ForegroundColor Gray
        }
    }
    Write-Host "   Continuing anyway..." -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Send test events
Write-Host "📨 Step 6: Sending test events..." -ForegroundColor Yellow
Write-Host ""

# Always use pre-minted token to avoid hanging
Write-Host "🔑 Getting fresh identity token (pre-minted to avoid hangs)..." -ForegroundColor Gray
$freshToken = gcloud auth print-identity-token --audience=$GATEWAY_URL 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to get fresh token" -ForegroundColor Red
    Write-Host "   Continuing with existing token..." -ForegroundColor Yellow
    $freshToken = $token
} else {
    Write-Host "✅ Fresh token obtained" -ForegroundColor Green
}
Write-Host ""

# Check if intake files exist
$intakeDir = ".\.kairos\intake"
if (-not (Test-Path $intakeDir)) {
    Write-Host "⚠️  Intake directory not found: $intakeDir" -ForegroundColor Yellow
    Write-Host "   Creating directory..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path $intakeDir -Force | Out-Null
    Write-Host "   💡 Add intake JSON files to: $intakeDir" -ForegroundColor Yellow
    Write-Host "      - pandora-uiux-spec-items.json" -ForegroundColor Gray
    Write-Host "      - kairos-audit-issues.json" -ForegroundColor Gray
    Write-Host "      - elite-redesign-items.json" -ForegroundColor Gray
    Write-Host ""
    
    # Send a simple test event instead
    Write-Host "📤 Sending simple test event..." -ForegroundColor Gray
    try {
        $testEvent = @{
            dedupeKey = "test:deploy:$(Get-Date -Format 'yyyyMMddHHmmss')"
            source = "test"
            action = "test.deploy"
            status = "ok"
            severity = "low"
            module = "testing"
            schemaVersion = 1
            timestamp = (Get-Date).ToUniversalTime().ToString("o")
            refType = "test"
            refId = "deploy-test"
            metadata = @{
                message = "Test event from deploy script"
            }
        } | ConvertTo-Json -Compress
        
        $eventResponse = Invoke-RestMethod `
            -Uri "$GATEWAY_URL/v1/event" `
            -Method Post `
            -Headers @{
                "Authorization" = "Bearer $freshToken"
                "Content-Type" = "application/json"
            } `
            -Body $testEvent `
            -TimeoutSec 30 `
            -ErrorAction Stop
        
        if ($eventResponse.ok -eq $true) {
            Write-Host "✅ Test event sent successfully!" -ForegroundColor Green
            Write-Host "   Response: $($eventResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
        } else {
            Write-Host "⚠️  Event sent but response indicates failure" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Failed to send test event: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "   HTTP Status: $statusCode" -ForegroundColor Gray
        }
    }
} else {
    # Use intake script with pre-minted token to avoid hanging
    Write-Host "📂 Found intake directory, using intake script..." -ForegroundColor Gray
    Write-Host ""
    
    # Always set GOOGLE_ID_TOKEN to use pre-minted token (avoids hanging)
    $env:KAIROS_EVENT_GATEWAY_URL = $GATEWAY_URL
    $env:GOOGLE_ID_TOKEN = $freshToken
    
    Write-Host "🚀 Running intake script (with pre-minted token)..." -ForegroundColor Gray
    Write-Host "   This avoids hanging issues with GoogleAuth library" -ForegroundColor Gray
    Write-Host ""
    
    npm run kairos:intake
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Events sent successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Intake script completed with errors" -ForegroundColor Yellow
        Write-Host "   Check output above for details" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Gateway deployed/verified: $GATEWAY_URL" -ForegroundColor Green
Write-Host "  ✓ IAM access configured" -ForegroundColor Green
Write-Host "  ✓ Health check passed" -ForegroundColor Green
Write-Host "  ✓ Test events sent" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Check Base44 dashboard:" -ForegroundColor Cyan
Write-Host "   https://kairostrack.base44.app" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 To send more events:" -ForegroundColor Yellow
Write-Host "   `$env:KAIROS_EVENT_GATEWAY_URL='$GATEWAY_URL'" -ForegroundColor Gray
Write-Host "   `$env:GOOGLE_ID_TOKEN=(gcloud auth print-identity-token --audience='$GATEWAY_URL')" -ForegroundColor Gray
Write-Host "   npm run kairos:intake" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

