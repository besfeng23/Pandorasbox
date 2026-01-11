# Rotate kairos-ingest-secret without newline/whitespace issues
# Run from repo root in PowerShell

$ErrorActionPreference = "Stop"

$PROJECT_ID = if ($env:PROJECT_ID) { $env:PROJECT_ID } else { "seismic-vista-480710-q5" }
$SECRET_NAME = "kairos-ingest-secret"

Write-Host "Rotating $SECRET_NAME (no newlines/whitespace)" -ForegroundColor Cyan
Write-Host ""

# Generate new secret (URL-safe, 48 bytes = 64 chars base64)
Write-Host "Generating new secret..." -ForegroundColor Yellow

# Try using Python first (most reliable)
try {
    $NEW_SECRET = python -c "import secrets; print(secrets.token_urlsafe(48))" 2>&1
    if ($LASTEXITCODE -ne 0 -or $NEW_SECRET -match "Error") {
        throw "Python failed"
    }
    $NEW_SECRET = $NEW_SECRET.ToString().Trim()
} catch {
    # Fallback: use .NET RNGCryptoServiceProvider
    Write-Host "Python not available, using .NET fallback..." -ForegroundColor Gray
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    $bytes = New-Object byte[] 48
    $rng.GetBytes($bytes)
    $rng.Dispose()
    $NEW_SECRET = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

Write-Host "Generated new secret ($($NEW_SECRET.Length) chars)"
Write-Host ""

Write-Host "Adding new version to Secret Manager..." -ForegroundColor Yellow

# Use Out-File -NoNewline to ensure no trailing newline
$NEW_SECRET | Out-File -FilePath "$env:TEMP\secret-temp.txt" -Encoding utf8 -NoNewline
gcloud secrets versions add $SECRET_NAME --data-file="$env:TEMP\secret-temp.txt" --project=$PROJECT_ID
Remove-Item "$env:TEMP\secret-temp.txt" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "New secret version added!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Update Base44 Secrets -> KAIROS_INGEST_SECRET to match:" -ForegroundColor Yellow
Write-Host ""
Write-Host $NEW_SECRET -ForegroundColor Cyan
Write-Host ""
Write-Host "After updating Base44, test with:" -ForegroundColor Gray
Write-Host "  .\scripts\test-direct-base44.ps1" -ForegroundColor Gray
