
$ErrorActionPreference = "Stop"

Write-Host "Starting Access Tunnels to Sovereign AI (GCP)..."
Write-Host "------------------------------------------------"

# 1. Start vLLM Tunnel (Port 8000)
Write-Host "Opening tunnel to pandora-inference (vLLM) on port 8000..."
$vllmJob = Start-Job -ScriptBlock {
    gcloud compute start-iap-tunnel pandora-inference 8000 --local-host-port=localhost:8000 --zone=us-central1-a --project=seismic-vista-480710-q5
}

# 2. Start Qdrant Tunnel (Port 6333)
Write-Host "Opening tunnel to pandora-qdrant (Qdrant) on port 6333..."
$qdrantJob = Start-Job -ScriptBlock {
    gcloud compute start-iap-tunnel pandora-qdrant 6333 --local-host-port=localhost:6333 --zone=us-central1-a --project=seismic-vista-480710-q5
}

Write-Host "Tunnels initialized in background jobs."
Write-Host "Please wait 5-10 seconds for connections to establish..."
Start-Sleep -Seconds 5

# Check Jobs
Get-Job

Write-Host "------------------------------------------------"
Write-Host "You can now run 'npm run dev' to talk to your remote AI."
Write-Host "To stop tunnels, close this PowerShell window or run 'Get-Job | Remove-Job -Force'"
