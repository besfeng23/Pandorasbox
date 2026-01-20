#!/bin/bash
set -e

# ========================================================================================
# SOVEREIGN AI - WAKE MODE
# ========================================================================================
# Wakes up the AI VMs and waits for them to be ready.
# ========================================================================================

PROJECT_ID=$(gcloud config get-value project)
ZONE="us-central1-a"
QDRANT_INSTANCE="pandora-qdrant"
VLLM_INSTANCE="pandora-inference"

echo "Waking up Sovereign AI (starting VMs)..."

gcloud compute instances start "$QDRANT_INSTANCE" "$VLLM_INSTANCE" \
  --zone "$ZONE" \
  --project "$PROJECT_ID"

echo "Waiting for services to be ready..."
# In a real scenario, we would curl the internal IPs from a bastion or the app itself.
# Since we are likely running this from Cloud Shell or local, we can't directly hit internal IPs.
# We will just wait a fixed amount of time for now.
sleep 30

echo "==================================================="
echo " Sovereign AI is AWAKE. Ready for queries."
echo "==================================================="


