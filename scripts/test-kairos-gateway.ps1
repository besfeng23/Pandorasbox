# Test Kairos Event Gateway and send a test event to Base44
# This verifies the gateway is working and events are reaching Base44

$GATEWAY_URL = "https://kairos-event-gateway-axypi7xsha-as.a.run.app"
$BASE44_URL = "https://kairostrack.base44.app/functions/ingest"

Write-Host "🧪 Testing Kairos Event Gateway" -ForegroundColor Cyan
Write-Host ""

# 1. Health check
Write-Host "1️⃣  Checking gateway health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$GATEWAY_URL/healthz" -UseBasicParsing
    Write-Host "   ✅ Gateway is healthy" -ForegroundColor Green
    Write-Host "   Response: $($health.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Gateway health check failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Get identity token
Write-Host "2️⃣  Getting identity token..." -ForegroundColor Yellow
try {
    $token = gcloud auth print-identity-token --audience=$GATEWAY_URL 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Failed to get identity token. Are you logged in?" -ForegroundColor Red
        Write-Host "   Run: gcloud auth login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "   ✅ Token obtained" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to get token: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. Send test event
Write-Host "3️⃣  Sending test event to gateway..." -ForegroundColor Yellow
$testEvent = @{
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
    schemaVersion = 1
    dedupeKey = "test:event:$(Get-Date -Format 'yyyyMMddHHmmss')"
    source = "test"
    actor = "powershell-script"
    module = "testing"
    action = "test.event"
    status = "ok"
    severity = "low"
    tags = @("test", "gateway-verification")
    metadata = @{
        test = $true
        timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
    }
} | ConvertTo-Json -Depth 10

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri "$GATEWAY_URL/v1/event" `
        -Method POST `
        -Headers $headers `
        -Body $testEvent `
        -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Event sent successfully!" -ForegroundColor Green
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "🎉 Test event sent! Check Base44 dashboard to see if it appears." -ForegroundColor Green
        Write-Host ""
        Write-Host "💡 If you don't see it in Base44:" -ForegroundColor Yellow
        Write-Host "   1. Check Base44 logs for errors" -ForegroundColor Gray
        Write-Host "   2. Verify KAIROS_INGEST_SECRET matches between GCP and Base44" -ForegroundColor Gray
        Write-Host "   3. Run: services\kairos-event-gateway\scripts\test-direct-base44.sh" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Unexpected status: $($response.StatusCode)" -ForegroundColor Yellow
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Failed to send event: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Error details: $responseBody" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Check Base44 dashboard: https://kairostrack.base44.app" -ForegroundColor Gray
Write-Host "   2. Run intake script to send all events: npm run kairos:intake" -ForegroundColor Gray
Write-Host "   3. Verify secret matches: services/kairos-event-gateway/scripts/test-direct-base44.sh" -ForegroundColor Gray

