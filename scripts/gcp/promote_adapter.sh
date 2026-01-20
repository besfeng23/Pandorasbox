#!/bin/bash
set -e

# ========================================================================================
# SOVEREIGN AI - PROMOTE ADAPTER
# ========================================================================================
# Updates the vLLM inference engine to use a specific fine-tuned adapter.
# ========================================================================================

ADAPTER_VERSION=${1:-"v1"}
PROJECT_ID=$(gcloud config get-value project)
ZONE="us-central1-a"
BUCKET_NAME="pandora-brain-${PROJECT_ID}"
VLLM_INSTANCE="vllm-gpu-vm"
BASE_MODEL="mistralai/Mistral-7B-Instruct-v0.3"

echo "==================================================="
echo " PROMOTING ADAPTER: $ADAPTER_VERSION"
echo "==================================================="

# Check if adapter exists in GCS
if ! gsutil ls "gs://${BUCKET_NAME}/adapters/${ADAPTER_VERSION}/" &>/dev/null; then
  echo "Error: Adapter ${ADAPTER_VERSION} not found in gs://${BUCKET_NAME}/adapters/"
  exit 1
fi

echo "[Step 1] Updating VM Metadata with new adapter config..."

# Construct the new startup script that downloads the adapter and runs vLLM with LoRA
NEW_STARTUP_SCRIPT="
set -e
echo 'Updating vLLM with adapter ${ADAPTER_VERSION}...'

# Install GCS fuse or just use gsutil to download (simpler for LoRA)
mkdir -p /home/jupyter/adapters/${ADAPTER_VERSION}
gsutil -m cp -r gs://${BUCKET_NAME}/adapters/${ADAPTER_VERSION}/* /home/jupyter/adapters/${ADAPTER_VERSION}/

# Stop existing vLLM container if any
docker stop vllm-server || true
docker rm vllm-server || true

# Run vLLM with LoRA module
docker run -d --name vllm-server \
  --gpus all \
  -p 8000:8000 \
  --ipc=host \
  -v /home/jupyter/adapters:/adapters \
  vllm/vllm-openai:latest \
  --model ${BASE_MODEL} \
  --enable-lora \
  --lora-modules pandora=/adapters/${ADAPTER_VERSION} \
  --max-lora-rank 16
"

gcloud compute instances add-metadata "$VLLM_INSTANCE" \
  --project "$PROJECT_ID" \
  --zone "$ZONE" \
  --metadata "startup-script=$NEW_STARTUP_SCRIPT"

echo "[Step 2] Restarting vLLM instance to apply changes..."
gcloud compute instances reset "$VLLM_INSTANCE" \
  --project "$PROJECT_ID" \
  --zone "$ZONE"

echo "==================================================="
echo " Promotion initiated. vLLM will be ready shortly."
echo " Use 'pandora' as the model name in your requests."
echo "==================================================="

