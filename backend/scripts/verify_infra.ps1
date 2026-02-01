
Write-Host "Verifying Local Sovereign AI Infrastructure..."
Write-Host "--------------------------------------------"

# 1. Check Docker (Optional for Remote Tunnels)
try {
    $dockerVersion = docker --version
    Write-Host "[OK] Docker found: $dockerVersion"
}
catch {
    Write-Host "[INFO] Docker not found. Assuming Remote/Tunnel Mode." -ForegroundColor Cyan
}

# 2. Check vLLM (Port 8000)
$vllmUrl = "http://localhost:8000/models"
try {
    $response = Invoke-RestMethod -Uri $vllmUrl -Method Get -ErrorAction Stop
    Write-Host "[OK] vLLM Service is responding at $vllmUrl"
}
catch {
    Write-Host "[WARNING] vLLM not responding at $vllmUrl. Is the container running?" -ForegroundColor Yellow
}

# 3. Check Qdrant (Port 6333)
$qdrantUrl = "http://localhost:6333/collections"
try {
    $response = Invoke-RestMethod -Uri $qdrantUrl -Method Get -ErrorAction Stop
    Write-Host "[OK] Qdrant Service is responding at $qdrantUrl"
}
catch {
    Write-Host "[WARNING] Qdrant not responding at $qdrantUrl. Is the container running?" -ForegroundColor Yellow
}

Write-Host "--------------------------------------------"
Write-Host "To start infrastructure, run: npm run infra:up"
