# Test direct Base44 signature verification
# This bypasses the gateway and tests if GCP secret matches Base44 secret
# Run from repo root in PowerShell

$ErrorActionPreference = "Stop"

$PROJECT_ID = if ($env:PROJECT_ID) { $env:PROJECT_ID } else { "seismic-vista-480710-q5" }
$SECRET_NAME = "kairos-ingest-secret"
$BASE44_URL = if ($env:BASE44_INGEST_URL) { $env:BASE44_INGEST_URL } else { "https://kairostrack.base44.app/functions/ingest" }

Write-Host "Testing direct Base44 signature verification" -ForegroundColor Cyan
Write-Host "Base44 URL: $BASE44_URL" -ForegroundColor Gray
Write-Host ""

# Get secret from GCP
Write-Host "Fetching secret from GCP..." -ForegroundColor Yellow
$SECRET = gcloud secrets versions access latest --secret=$SECRET_NAME --project=$PROJECT_ID
$SECRET = $SECRET.Trim()

Write-Host "Secret retrieved ($($SECRET.Length) chars)" -ForegroundColor Green
Write-Host ""

# Create test event body
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$dedupeKey = "debug:direct:$(Get-Date -UFormat %s)"
$BODY_OBJ = @{
    timestamp = $timestamp
    schemaVersion = 1
    dedupeKey = $dedupeKey
    source = "debug"
    actor = "shell"
    module = "sig"
    action = "direct.test"
    status = "ok"
    severity = "low"
} | ConvertTo-Json -Compress

Write-Host "Test event:" -ForegroundColor Yellow
$BODY_OBJ | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

# Calculate HMAC signature
Write-Host "Calculating HMAC signature..." -ForegroundColor Yellow

# Use .NET HMACSHA256
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($SECRET)
$hashBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($BODY_OBJ))
$SIG = [Convert]::ToBase64String($hashBytes)
$hmac.Dispose()

Write-Host "Signature calculated" -ForegroundColor Green
Write-Host ""

# Send to Base44
Write-Host "Sending to Base44..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri $BASE44_URL `
        -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Signature" = $SIG
        } `
        -Body $BODY_OBJ `
        -ErrorAction Stop
    
    Write-Host ""
    Write-Host "SUCCESS! Base44 accepted the signature (HTTP 200)" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "GCP secret matches Base44 secret!" -ForegroundColor Green
    exit 0
} catch {
    $statusCode = "unknown"
    $responseBody = $null
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $reader.Close()
        } catch {
            # Ignore errors reading response
        }
    } else {
        $responseBody = $_.Exception.Message
    }
    
    Write-Host ""
    Write-Host "FAILED! Base44 rejected the signature (HTTP $statusCode)" -ForegroundColor Red
    if ($responseBody) {
        Write-Host "Response: $responseBody" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "This means GCP secret != Base44 secret" -ForegroundColor Yellow
    Write-Host "Check Base44 Secrets -> KAIROS_INGEST_SECRET value" -ForegroundColor Gray
    Write-Host ""
    Write-Host "GCP Secret (first 20 chars): $($SECRET.Substring(0, [Math]::Min(20, $SECRET.Length)))..." -ForegroundColor Cyan
    exit 1
}
