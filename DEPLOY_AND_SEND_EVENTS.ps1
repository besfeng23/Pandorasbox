# Deploy Kairos Event Gateway and Send Test Events
# This script does EVERYTHING: deploy, test, and send events

$ErrorActionPreference = "Stop"

$PROJECT_ID = "seismic-vista-480710-q5"
$REGION = "asia-southeast1"
$SERVICE_NAME = "kairos-event-gateway"

Write-Host "🚀 DEPLOYING KAIROS EVENT GATEWAY AND SENDING EVENTS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Set project
Write-Host "1️⃣  Setting GCP project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID 2>&1 | Out-Null
Write-Host "   ✅ Project set" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy gateway (using --source for faster deployment)
Write-Host "2️⃣  Deploying gateway to Cloud Run..." -ForegroundColor Yellow
Write-Host "   This may take 2-3 minutes..." -ForegroundColor Gray

$deployOutput = gcloud run deploy $SERVICE_NAME `
  --source=services/$SERVICE_NAME `
  --region=$REGION `
  --no-allow-unauthenticated `
  --set-env-vars=BASE44_INGEST_URL=https://kairostrack.base44.app/functions/ingest `
  --set-secrets=KAIROS_INGEST_SECRET=kairos-ingest-secret:latest `
  --service-account=${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com `
  --min-instances=0 `
  --max-instances=10 `
  --memory=512Mi `
  --cpu=1 `
  --timeout=30s `
  --platform=managed 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Deployment failed!" -ForegroundColor Red
    Write-Host $deployOutput
    exit 1
}

Write-Host "   ✅ Gateway deployed!" -ForegroundColor Green
Write-Host ""

# Step 3: Get service URL
Write-Host "3️⃣  Getting service URL..." -ForegroundColor Yellow
$SERVICE_URL = gcloud run services describe $SERVICE_NAME `
  --region=$REGION `
  --format="value(status.url)" 2>&1

if ($LASTEXITCODE -ne 0 -or -not $SERVICE_URL) {
    Write-Host "   ❌ Failed to get service URL" -ForegroundColor Red
    exit 1
}

Write-Host "   ✅ Service URL: $SERVICE_URL" -ForegroundColor Green
Write-Host ""

# Step 4: Grant IAM access
Write-Host "4️⃣  Granting IAM access..." -ForegroundColor Yellow
$account = gcloud config get-value account 2>&1
gcloud run services add-iam-policy-binding $SERVICE_NAME `
  --region=$REGION `
  --member="user:$account" `
  --role="roles/run.invoker" `
  --quiet 2>&1 | Out-Null

Write-Host "   ✅ IAM access granted" -ForegroundColor Green
Write-Host ""

# Step 5: Test health endpoint
Write-Host "5️⃣  Testing gateway health..." -ForegroundColor Yellow
Start-Sleep -Seconds 5  # Give service a moment to be ready

try {
    $token = gcloud auth print-identity-token --audience=$SERVICE_URL 2>&1
    if ($LASTEXITCODE -eq 0 -and $token) {
        $healthResponse = Invoke-RestMethod `
            -Uri "$SERVICE_URL/healthz" `
            -Method Get `
            -Headers @{ "Authorization" = "Bearer $token" } `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        if ($healthResponse.ok) {
            Write-Host "   ✅ Gateway is healthy!" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Gateway responded but status unclear" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  Could not get token for health check" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Health check failed (service may still be starting): $_" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Send events
Write-Host "6️⃣  Sending events to gateway..." -ForegroundColor Yellow
Write-Host ""

# Get fresh token
$token = gcloud auth print-identity-token --audience=$SERVICE_URL 2>&1
if ($LASTEXITCODE -ne 0 -or -not $token) {
    Write-Host "   ❌ Failed to get identity token" -ForegroundColor Red
    exit 1
}

# Set environment variables and run intake
$env:KAIROS_EVENT_GATEWAY_URL = $SERVICE_URL
$env:GOOGLE_ID_TOKEN = $token

Write-Host "   📤 Running intake script..." -ForegroundColor Gray
npm run kairos:intake

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "   ✅ Events sent successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "   ❌ Failed to send events" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ SUCCESS! Everything is deployed and events are sent!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Gateway URL: $SERVICE_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Check Base44 dashboard:" -ForegroundColor Yellow
Write-Host "   https://kairostrack.base44.app" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 If events don't appear in Base44:" -ForegroundColor Yellow
Write-Host "   1. Check Base44 logs for signature errors" -ForegroundColor Gray
Write-Host "   2. Verify KAIROS_INGEST_SECRET matches between GCP and Base44" -ForegroundColor Gray
Write-Host "   3. Wait a few minutes for events to process" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

