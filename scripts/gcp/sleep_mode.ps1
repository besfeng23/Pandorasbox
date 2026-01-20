# ========================================================================================
# SOVEREIGN AI - SLEEP MODE (PowerShell)
# ========================================================================================
# Pauses the expensive AI VMs to save costs when not in use.
# ========================================================================================

$ErrorActionPreference = "Stop"

$PROJECT_ID = gcloud config get-value project
$ZONE = "us-central1-a"
$QDRANT_INSTANCE = "qdrant-vm"
$VLLM_INSTANCE = "vllm-gpu-vm"

Write-Host "Putting Sovereign AI to SLEEP (stopping VMs)..."

gcloud compute instances stop $QDRANT_INSTANCE $VLLM_INSTANCE `
  --zone $ZONE `
  --project $PROJECT_ID

Write-Host "==================================================="
Write-Host " Sovereign AI is now ASLEEP. Costs paused."
Write-Host "==================================================="


