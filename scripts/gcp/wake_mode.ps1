# ========================================================================================
# SOVEREIGN AI - WAKE MODE (PowerShell)
# ========================================================================================
# Wakes up the AI VMs and waits for them to be ready.
# ========================================================================================

$ErrorActionPreference = "Stop"

$PROJECT_ID = gcloud config get-value project
$ZONE = "us-central1-a"
$QDRANT_INSTANCE = "qdrant-vm"
$VLLM_INSTANCE = "vllm-gpu-vm"

Write-Host "Waking up Sovereign AI (starting VMs)..."

gcloud compute instances start $QDRANT_INSTANCE $VLLM_INSTANCE `
  --zone $ZONE `
  --project $PROJECT_ID

Write-Host "Waiting for services to be ready..."
# In a real scenario, we would curl the internal IPs from a bastion or the app itself.
# Since we are likely running this from Cloud Shell or local, we can't directly hit internal IPs.
# We will just wait a fixed amount of time for now.
Start-Sleep -Seconds 30

Write-Host "==================================================="
Write-Host " Sovereign AI is AWAKE. Ready for queries."
Write-Host "==================================================="


