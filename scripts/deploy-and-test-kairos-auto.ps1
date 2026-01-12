#!/usr/bin/env pwsh
# Non-interactive version: Deploy and test Kairos Event Gateway automatically
# Use this when you want to skip prompts and redeploy always

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "seismic-vista-480710-q5"
$REGION = "asia-southeast1"
$SERVICE_NAME = "kairos-event-gateway"
$GATEWAY_URL = $null

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 Kairos Event Gateway - Auto Deploy & Test" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Quick checks
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudPath) {
    Write-Host "❌ gcloud CLI not found" -ForegroundColor Red
    exit 1
}

$accountOutput = & gcloud config get-value account 2>&1
if ($accountOutput -is [System.Array]) {
    $account = ($accountOutput | Where-Object { $_ -is [string] }) -join "`n"
} else {
    $account = $accountOutput.ToString()
}
$account = $account.Trim()
if ($LASTEXITCODE -ne 0 -or -not $account -or $account -match "ERROR") {
    Write-Host "❌ Not authenticated. Run: gcloud auth login" -ForegroundColor Red
    exit 1
}

& gcloud config set project $PROJECT_ID 2>&1 | Out-Null
Write-Host "✅ Prerequisites OK" -ForegroundColor Green
Write-Host ""

# Deploy
Write-Host "🚀 Deploying..." -ForegroundColor Yellow
$deployScript = "services\$SERVICE_NAME\deploy.ps1"
if (-not (Test-Path $deployScript)) {
    Write-Host "❌ Deployment script not found" -ForegroundColor Red
    exit 1
}

& $deployScript
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

# Get URL
$urlOutput = & gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>&1
if ($urlOutput -is [System.Array]) {
    $GATEWAY_URL = ($urlOutput | Where-Object { $_ -is [string] -and $_ -notmatch "ERROR" }) -join "`n"
} else {
    $GATEWAY_URL = $urlOutput.ToString()
}
$GATEWAY_URL = $GATEWAY_URL.Trim()

if ($LASTEXITCODE -ne 0 -or -not $GATEWAY_URL -or $GATEWAY_URL -match "ERROR" -or $GATEWAY_URL -match "not found") {
    Write-Host "❌ Failed to get service URL" -ForegroundColor Red
    Write-Host "   Output: $GATEWAY_URL" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Deployed: $GATEWAY_URL" -ForegroundColor Green
Write-Host ""

# Grant access
Write-Host "🔐 Granting IAM access..." -ForegroundColor Yellow
$currentAccountOutput = & gcloud config get-value account
if ($currentAccountOutput -is [System.Array]) {
    $currentAccount = ($currentAccountOutput | Where-Object { $_ -is [string] }) -join "`n"
} else {
    $currentAccount = $currentAccountOutput.ToString()
}
$currentAccount = $currentAccount.Trim()
& gcloud run services add-iam-policy-binding $SERVICE_NAME --region=$REGION --member="user:$currentAccount" --role="roles/run.invoker" --project=$PROJECT_ID 2>&1 | Out-Null
Write-Host "✅ IAM access configured" -ForegroundColor Green
Write-Host ""

# Wait for service
Write-Host "⏳ Waiting for service to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test health
Write-Host "🏥 Testing health..." -ForegroundColor Yellow
$tokenOutput = & gcloud auth print-identity-token --audience=$GATEWAY_URL 2>&1
if ($tokenOutput -is [System.Array]) {
    $token = ($tokenOutput | Where-Object { $_ -is [string] -and $_ -notmatch "ERROR" }) -join "`n"
} else {
    $token = $tokenOutput.ToString()
}
$token = $token.Trim()
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to get token" -ForegroundColor Red
    exit 1
}

try {
    $healthResponse = Invoke-RestMethod `
        -Uri "$GATEWAY_URL/healthz" `
        -Method Get `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -ErrorAction Stop
    
    if ($healthResponse.ok) {
        Write-Host "✅ Health check passed" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Health check failed (continuing...)" -ForegroundColor Yellow
}
Write-Host ""

# Send events (always use pre-minted token to avoid hanging)
Write-Host "📨 Sending test events..." -ForegroundColor Yellow
$freshTokenOutput = & gcloud auth print-identity-token --audience=$GATEWAY_URL 2>&1
if ($freshTokenOutput -is [System.Array]) {
    $freshToken = ($freshTokenOutput | Where-Object { $_ -is [string] -and $_ -notmatch "ERROR" }) -join "`n"
} else {
    $freshToken = $freshTokenOutput.ToString()
}
$freshToken = $freshToken.Trim()
if (-not $freshToken -or $freshToken -match "ERROR") {
    $freshToken = $token
}

$intakeDir = ".\.kairos\intake"
if (Test-Path $intakeDir) {
    # Always set GOOGLE_ID_TOKEN to avoid hanging in GoogleAuth library
    $env:KAIROS_EVENT_GATEWAY_URL = $GATEWAY_URL
    $env:GOOGLE_ID_TOKEN = $freshToken
    npm run kairos:intake
} else {
    # Send simple test event
    $testEvent = @{
        dedupeKey = "test:auto:$(Get-Date -Format 'yyyyMMddHHmmss')"
        source = "test"
        action = "test.auto"
        status = "ok"
        severity = "low"
        module = "testing"
        schemaVersion = 1
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        refType = "test"
        refId = "auto-test"
        metadata = @{ message = "Auto test event" }
    } | ConvertTo-Json -Compress
    
    try {
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
        
        if ($eventResponse.ok) {
            Write-Host "✅ Test event sent" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Test event failed: $_" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Complete! Gateway: $GATEWAY_URL" -ForegroundColor Green
Write-Host "📊 Dashboard: https://kairostrack.base44.app" -ForegroundColor Cyan

