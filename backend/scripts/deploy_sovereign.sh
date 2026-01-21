#!/bin/bash
set -e

# ========================================================================================
# PANDORA'S BOX - SOVEREIGN INFRASTRUCTURE DEPLOYMENT
# ========================================================================================
# This script deploys the complete private AI infrastructure on Google Cloud Platform.
# Components:
#   1. VPC Network & Serverless Connector (Private Communication)
#   2. Qdrant Vector Database (Private GCE VM)
#   3. vLLM Inference Engine (Private GPU GCE VM)
#   4. Next.js Application (Cloud Run)
# ========================================================================================

# --- Configuration ---
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
ZONE="us-central1-a"
NETWORK_NAME="pandora-vpc"
SUBNET_NAME="pandora-subnet"
CONNECTOR_NAME="pandora-connector"
SERVICE_NAME="pandora-chat-app"
REPO_NAME="pandora"

# VM Configs
QDRANT_INSTANCE="pandora-qdrant"
VLLM_INSTANCE="pandora-inference"
MACHINE_TYPE_QDRANT="e2-standard-2"
# Using n1-standard-4 with T4 GPU is a good balance for inference
MACHINE_TYPE_VLLM="n1-standard-4" 
ACCELERATOR_TYPE="nvidia-tesla-t4"

echo "==================================================="
echo "   DEPLOYING SOVEREIGN INFRASTRUCTURE FOR: $PROJECT_ID"
echo "==================================================="

# --- Step 0: Checks ---
if [ -z "$PROJECT_ID" ]; then
  echo "Error: No Google Cloud Project set. Run 'gcloud config set project <PROJECT_ID>'."
  exit 1
fi

echo "[Step 0] Enabling required services..."
gcloud services enable \
  compute.googleapis.com \
  vpcaccess.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project "$PROJECT_ID"

# --- Step 1: Network ---
echo "[Step 1] Setting up Network..."

# Check if VPC exists, else create
if ! gcloud compute networks describe "$NETWORK_NAME" --project "$PROJECT_ID" &>/dev/null; then
  echo "Creating VPC $NETWORK_NAME..."
  gcloud compute networks create "$NETWORK_NAME" --subnet-mode=custom --project "$PROJECT_ID"
else
  echo "VPC $NETWORK_NAME already exists."
fi

# Check if Subnet exists, else create
if ! gcloud compute networks subnets describe "$SUBNET_NAME" --region "$REGION" --project "$PROJECT_ID" &>/dev/null; then
  echo "Creating Subnet $SUBNET_NAME..."
  gcloud compute networks subnets create "$SUBNET_NAME" \
    --network "$NETWORK_NAME" \
    --region "$REGION" \
    --range "10.0.0.0/20" \
    --project "$PROJECT_ID"
else
  echo "Subnet $SUBNET_NAME already exists."
fi

# Create VPC Connector
if ! gcloud compute networks vpc-access connectors describe "$CONNECTOR_NAME" --region "$REGION" --project "$PROJECT_ID" &>/dev/null; then
  echo "Creating VPC Connector $CONNECTOR_NAME (this may take a few minutes)..."
  gcloud compute networks vpc-access connectors create "$CONNECTOR_NAME" \
    --region "$REGION" \
    --subnet "$SUBNET_NAME" \
    --project "$PROJECT_ID" \
    --min-instances 2 \
    --max-instances 3 \
    --machine-type e2-micro
else
  echo "VPC Connector $CONNECTOR_NAME already exists."
fi

# Firewall Rules
echo "Creating Firewall Rules..."
# Allow internal traffic from VPC connector range (approximate, usually /28 in the subnet)
# We allow 10.0.0.0/8 internal traffic to simplify for the custom VPC
if ! gcloud compute firewall-rules describe "pandora-allow-internal" --project "$PROJECT_ID" &>/dev/null; then
  gcloud compute firewall-rules create "pandora-allow-internal" \
    --network "$NETWORK_NAME" \
    --allow tcp:6333,tcp:8000,tcp:22,icmp \
    --source-ranges "10.0.0.0/8" \
    --description "Allow internal communication for Qdrant and vLLM" \
    --project "$PROJECT_ID"
fi

# --- Step 2: Spin up Qdrant ---
echo "[Step 2] Deploying Qdrant VM..."

if ! gcloud compute instances describe "$QDRANT_INSTANCE" --zone "$ZONE" --project "$PROJECT_ID" &>/dev/null; then
  gcloud compute instances create "$QDRANT_INSTANCE" \
    --project "$PROJECT_ID" \
    --zone "$ZONE" \
    --machine-type "$MACHINE_TYPE_QDRANT" \
    --network "$NETWORK_NAME" \
    --subnet "$SUBNET_NAME" \
    --no-address \
    --image-family "cos-stable" \
    --image-project "cos-cloud" \
    --metadata "startup-script=docker run -d --restart=always -p 6333:6333 qdrant/qdrant:v1.9.3" \
    --tags "qdrant-server"
else
  echo "Qdrant VM already exists."
fi

echo "Waiting for Qdrant IP..."
QDRANT_IP=$(gcloud compute instances describe "$QDRANT_INSTANCE" --zone "$ZONE" --format='value(networkInterfaces[0].networkIp)' --project "$PROJECT_ID")
echo "Qdrant Internal IP: $QDRANT_IP"

# --- Step 3: Spin up vLLM ---
echo "[Step 3] Deploying vLLM GPU VM..."

if ! gcloud compute instances describe "$VLLM_INSTANCE" --zone "$ZONE" --project "$PROJECT_ID" &>/dev/null; then
  # Note: This requires GPU quota in the region.
  echo "Creating vLLM VM with T4 GPU. This might fail if you lack Quota."
  
  # Startup script to install drivers and run vLLM
  # Using a standard Deep Learning Image which has drivers pre-installed is easier, but COS is lighter.
  # For GPU on COS, we need the installer. Let's use Deep Learning Image for simplicity if possible,
  # or stick to the prompt instructions. Prompt says "Startup Script: docker run ...".
  # On standard Debian/COS, GPU drivers need install.
  # We'll use the "Deep Learning VM" image which has docker + nvidia drivers ready.
  
  gcloud compute instances create "$VLLM_INSTANCE" \
    --project "$PROJECT_ID" \
    --zone "$ZONE" \
    --machine-type "$MACHINE_TYPE_VLLM" \
    --accelerator "type=$ACCELERATOR_TYPE,count=1" \
    --maintenance-policy "TERMINATE" \
    --network "$NETWORK_NAME" \
    --subnet "$SUBNET_NAME" \
    --no-address \
    --image-family "common-cu121" \
    --image-project "deeplearning-platform-release" \
    --metadata "install-nvidia-driver=True,startup-script=docker run -d --gpus all -p 8000:8000 --ipc=host vllm/vllm-openai:latest --model mistralai/Mistral-7B-Instruct-v0.3" \
    --tags "vllm-server"
else
  echo "vLLM VM already exists."
fi

echo "Waiting for vLLM IP..."
VLLM_IP=$(gcloud compute instances describe "$VLLM_INSTANCE" --zone "$ZONE" --format='value(networkInterfaces[0].networkIp)' --project "$PROJECT_ID")
echo "vLLM Internal IP: $VLLM_IP"


# --- Step 4: Deploy App ---
echo "[Step 4] Deploying Next.js App to Cloud Run..."

# Create Artifact Registry if missing
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --project "$PROJECT_ID" &>/dev/null; then
  echo "Creating Artifact Registry repository..."
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Pandora Docker Repository" \
    --project "$PROJECT_ID"
fi

IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:latest"

echo "Building Container Image (Cloud Build)..."
gcloud builds submit --tag "$IMAGE_URI" --project "$PROJECT_ID"

echo "Deploying Service..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --vpc-connector "projects/$PROJECT_ID/locations/$REGION/connectors/$CONNECTOR_NAME" \
  --set-env-vars "INFERENCE_URL=http://$VLLM_IP:8000/v1" \
  --set-env-vars "INFERENCE_MODEL=pandora" \
  --set-env-vars "QDRANT_URL=http://$QDRANT_IP:6333" \
  --set-env-vars "EMBEDDING_MODEL=all-MiniLM-L6-v2" \
  --set-env-vars "FIREBASE_PROJECT_ID=$PROJECT_ID" \
  --service-account "pandora-cloudrun-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --project "$PROJECT_ID"

# --- Verification ---
echo "==================================================="
echo "   DEPLOYMENT COMPLETE"
echo "==================================================="
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)' --project "$PROJECT_ID")
echo "App Public URL:   $SERVICE_URL"
echo "Qdrant Internal:  $QDRANT_IP:6333"
echo "vLLM Internal:    $VLLM_IP:8000"
echo "==================================================="


