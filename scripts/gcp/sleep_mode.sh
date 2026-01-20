#!/bin/bash
set -e

# ========================================================================================
# SOVEREIGN AI - SLEEP MODE
# ========================================================================================
# Pauses the expensive AI VMs to save costs when not in use.
# ========================================================================================

PROJECT_ID=$(gcloud config get-value project)
ZONE="us-central1-a"
QDRANT_INSTANCE="qdrant-vm"
VLLM_INSTANCE="vllm-gpu-vm"

echo "Putting Sovereign AI to SLEEP (stopping VMs)..."

gcloud compute instances stop "$QDRANT_INSTANCE" "$VLLM_INSTANCE" \
  --zone "$ZONE" \
  --project "$PROJECT_ID"

echo "==================================================="
echo " Sovereign AI is now ASLEEP. Costs paused."
echo "==================================================="


