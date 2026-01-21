#!/bin/bash
set -e

# ========================================================================================
# SOVEREIGN AI - RUN FINETUNE
# ========================================================================================
# Ephemeral training job: Spins up a GPU VM, trains, saves adapter, and self-destructs.
# ========================================================================================

PROJECT_ID=$(gcloud config get-value project)
ZONE="us-central1-a"
BUCKET_NAME="pandora-brain-${PROJECT_ID}"
VM_NAME="pandora-trainer"
MACHINE_TYPE="g2-standard-4" # L4 GPU, good for fine-tuning
IMAGE_FAMILY="pytorch-latest-gpu"
IMAGE_PROJECT="deeplearning-platform-release"

echo "==================================================="
echo " STARTING FINE-TUNING JOB"
echo "==================================================="

# Step A: Export Dataset
echo "[Step A] Exporting dataset locally..."
npx tsx scripts/training/export_dataset.ts

# Step B: Upload to GCS
echo "[Step B] Uploading dataset to GCS..."
if ! gsutil ls "gs://${BUCKET_NAME}" &>/dev/null; then
  echo "Creating bucket ${BUCKET_NAME}..."
  gsutil mb -l "us-central1" "gs://${BUCKET_NAME}"
fi
gsutil cp scripts/training/data/dataset.jsonl "gs://${BUCKET_NAME}/data/dataset.jsonl"
gsutil cp scripts/training/train_lora.py "gs://${BUCKET_NAME}/scripts/train_lora.py"

# Step C: Create Ephemeral VM
echo "[Step C] Creating Training VM ($MACHINE_TYPE)..."
gcloud compute instances create "$VM_NAME" \
  --project "$PROJECT_ID" \
  --zone "$ZONE" \
  --machine-type "$MACHINE_TYPE" \
  --image-family "$IMAGE_FAMILY" \
  --image-project "$IMAGE_PROJECT" \
  --maintenance-policy "TERMINATE" \
  --scopes "https://www.googleapis.com/auth/cloud-platform" \
  --metadata "startup-script=
    set -e
    echo 'Starting Training Job...'
    
    # Install dependencies
    pip install --upgrade pip
    pip install unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git
    pip install --no-deps trl peft accelerate bitsandbytes
    
    # Download data
    mkdir -p /home/jupyter/training
    gsutil cp gs://${BUCKET_NAME}/data/dataset.jsonl /home/jupyter/training/
    gsutil cp gs://${BUCKET_NAME}/scripts/train_lora.py /home/jupyter/training/
    
    # Run Training
    cd /home/jupyter/training
    python3 train_lora.py
    
    # Upload Adapter
    gsutil cp -r model_adapter gs://${BUCKET_NAME}/adapters/v1/
    
    echo 'Training Complete. Adapter uploaded.'
    
    # Self-Destruct
    gcloud compute instances delete ${VM_NAME} --zone ${ZONE} --quiet
  "

echo "Training VM created. It will run the job and delete itself."
echo "Monitor logs via: gcloud compute instances get-serial-port-output $VM_NAME --zone $ZONE"


