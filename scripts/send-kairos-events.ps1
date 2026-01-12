# Send Kairos events to Base44 via Event Gateway
# This will populate the Base44 dashboard with events

$GATEWAY_URL = "https://kairos-event-gateway-axypi7xsha-as.a.run.app"

Write-Host "📥 Sending Kairos Events to Base44" -ForegroundColor Cyan
Write-Host "📍 Gateway: $GATEWAY_URL" -ForegroundColor Gray
Write-Host ""

# Check if intake files exist
$intakeDir = ".\.kairos\intake"
if (-not (Test-Path $intakeDir)) {
    Write-Host "❌ Intake directory not found: $intakeDir" -ForegroundColor Red
    exit 1
}

$specFile = "$intakeDir\pandora-uiux-spec-items.json"
$auditFile = "$intakeDir\kairos-audit-issues.json"
$eliteFile = "$intakeDir\elite-redesign-items.json"

$hasFiles = $false
if (Test-Path $specFile) {
    $specCount = (Get-Content $specFile | ConvertFrom-Json).Count
    Write-Host "✅ Found UI/UX spec items: $specCount" -ForegroundColor Green
    $hasFiles = $true
}
if (Test-Path $auditFile) {
    $auditCount = (Get-Content $auditFile | ConvertFrom-Json).Count
    Write-Host "✅ Found audit issues: $auditCount" -ForegroundColor Green
    $hasFiles = $true
}
if (Test-Path $eliteFile) {
    $eliteCount = (Get-Content $eliteFile | ConvertFrom-Json).Count
    Write-Host "✅ Found elite redesign items: $eliteCount" -ForegroundColor Green
    $hasFiles = $true
}

if (-not $hasFiles) {
    Write-Host "❌ No intake files found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔐 Getting authentication token..." -ForegroundColor Yellow

# Get identity token
try {
    $token = gcloud auth print-identity-token --audience=$GATEWAY_URL 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to get identity token" -ForegroundColor Red
        Write-Host "   Run: gcloud auth login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Token obtained" -ForegroundColor Green
} catch {
    Write-Host "❌ Error getting token: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📤 Sending events via intake script..." -ForegroundColor Yellow
Write-Host ""

# Set environment variables and run intake script
$env:KAIROS_EVENT_GATEWAY_URL = $GATEWAY_URL
$env:GOOGLE_ID_TOKEN = $token

npm run kairos:intake

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Events sent successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Check Base44 dashboard:" -ForegroundColor Cyan
    Write-Host "   https://kairostrack.base44.app" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 If events don't appear:" -ForegroundColor Yellow
    Write-Host "   1. Verify KAIROS_INGEST_SECRET matches between GCP and Base44" -ForegroundColor Gray
    Write-Host "   2. Check Base44 logs for signature errors" -ForegroundColor Gray
    Write-Host "   3. Run: services\kairos-event-gateway\scripts\test-direct-base44.sh" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Failed to send events. Check errors above." -ForegroundColor Red
    exit 1
}

