# ========================================================================================
# PANDORA'S BOX - SOVEREIGN INFRASTRUCTURE DEPLOYMENT (PowerShell)
# ========================================================================================

$ErrorActionPreference = "Stop"

# --- Configuration ---
$PROJECT_ID = gcloud config get-value project
$REGION = "us-central1"
$ZONE = "us-central1-f"
$NETWORK_NAME = "pandora-vpc"
$SUBNET_NAME = "pandora-subnet"
$CONNECTOR_NAME = "pandora-connector"
$SERVICE_NAME = "pandora-chat-app"
$REPO_NAME = "pandora"

# VM Configs
$QDRANT_INSTANCE = "pandora-qdrant"
$VLLM_INSTANCE = "pandora-inference"
$MACHINE_TYPE_QDRANT = "e2-standard-2"
$MACHINE_TYPE_VLLM = "n1-standard-4" 
$ACCELERATOR_TYPE = "nvidia-tesla-t4"

Write-Host "==================================================="
Write-Host "   DEPLOYING SOVEREIGN INFRASTRUCTURE FOR: $PROJECT_ID"
Write-Host "==================================================="

# --- Step 0: Checks ---
if (-not $PROJECT_ID) {
  Write-Error "No Google Cloud Project set. Run 'gcloud config set project <PROJECT_ID>'."
}

Write-Host "[Step 0] Enabling required services..."
gcloud services enable `
  compute.googleapis.com `
  vpcaccess.googleapis.com `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  cloudbuild.googleapis.com `
  --project "$PROJECT_ID"

# --- Step 1: Network ---
Write-Host "[Step 1] Setting up Network..."

# Check if VPC exists
$vpcExists = gcloud compute networks list --project "$PROJECT_ID" --filter="name=$NETWORK_NAME" --format="value(name)"
if (-not $vpcExists) {
  Write-Host "Creating VPC $NETWORK_NAME..."
  gcloud compute networks create "$NETWORK_NAME" --subnet-mode=custom --project "$PROJECT_ID"
} else {
  Write-Host "VPC $NETWORK_NAME already exists."
}

# Check if Subnet exists
$subnetExists = gcloud compute networks subnets list --project "$PROJECT_ID" --regions "$REGION" --filter="name=$SUBNET_NAME" --format="value(name)"
if (-not $subnetExists) {
  Write-Host "Creating Subnet $SUBNET_NAME..."
  gcloud compute networks subnets create "$SUBNET_NAME" `
    --network "$NETWORK_NAME" `
    --region "$REGION" `
    --range "10.0.0.0/20" `
    --project "$PROJECT_ID"
} else {
  Write-Host "Subnet $SUBNET_NAME already exists."
}

# Create VPC Connector
$connectorExists = gcloud compute networks vpc-access connectors list --region "$REGION" --project "$PROJECT_ID" --filter="name=$CONNECTOR_NAME" --format="value(name)"
if (-not $connectorExists) {
  Write-Host "Creating VPC Connector $CONNECTOR_NAME (this may take a few minutes)..."
  gcloud compute networks vpc-access connectors create "$CONNECTOR_NAME" `
    --region "$REGION" `
    --subnet "$SUBNET_NAME" `
    --project "$PROJECT_ID" `
    --min-instances 2 `
    --max-instances 3 `
    --machine-type e2-micro
} else {
  Write-Host "VPC Connector $CONNECTOR_NAME already exists."
}

# Firewall Rules
Write-Host "Creating Firewall Rules..."
$firewallExists = gcloud compute firewall-rules list --project "$PROJECT_ID" --filter="name=pandora-allow-internal" --format="value(name)"
if (-not $firewallExists) {
  gcloud compute firewall-rules create "pandora-allow-internal" `
    --network "$NETWORK_NAME" `
    --allow "tcp:6333,tcp:8000,tcp:22,icmp" `
    --source-ranges "10.0.0.0/8" `
    --description "Allow internal communication for Qdrant and vLLM" `
    --project "$PROJECT_ID"
}

# --- Step 2: Spin up Qdrant ---
Write-Host "[Step 2] Deploying Qdrant VM..."

$qdrantExists = gcloud compute instances list --project "$PROJECT_ID" --zones "$ZONE" --filter="name=$QDRANT_INSTANCE" --format="value(name)"
if (-not $qdrantExists) {
  gcloud compute instances create "$QDRANT_INSTANCE" `
    --project "$PROJECT_ID" `
    --zone "$ZONE" `
    --machine-type "$MACHINE_TYPE_QDRANT" `
    --network "$NETWORK_NAME" `
    --subnet "$SUBNET_NAME" `
    --no-address `
    --image-family "cos-stable" `
    --image-project "cos-cloud" `
    --metadata "startup-script=docker run -d --restart=always -p 6333:6333 qdrant/qdrant:v1.9.3" `
    --tags "qdrant-server"
} else {
  Write-Host "Qdrant VM already exists."
}

Write-Host "Waiting for Qdrant IP..."
$QDRANT_IP = gcloud compute instances list --project "$PROJECT_ID" --filter="name=$QDRANT_INSTANCE" --format='value(networkInterfaces[0].networkIp)'
Write-Host "Qdrant Internal IP: $QDRANT_IP"

# --- Step 3: Spin up vLLM ---
Write-Host "[Step 3] Deploying vLLM GPU VM..."

$vllmExists = gcloud compute instances list --project "$PROJECT_ID" --filter="name=$VLLM_INSTANCE" --format="value(name)"
if (-not $vllmExists) {
  Write-Host "Creating vLLM VM with T4 GPU..."
  
  gcloud compute instances create "$VLLM_INSTANCE" `
    --project "$PROJECT_ID" `
    --zone "$ZONE" `
    --machine-type "$MACHINE_TYPE_VLLM" `
    --accelerator "type=$ACCELERATOR_TYPE,count=1" `
    --maintenance-policy "TERMINATE" `
    --network "$NETWORK_NAME" `
    --subnet "$SUBNET_NAME" `
    --no-address `
    --image-family "common-cu128-ubuntu-2204-nvidia-570" `
    --image-project "deeplearning-platform-release" `
    --metadata "install-nvidia-driver=True,startup-script=docker run -d --gpus all -p 8000:8000 --ipc=host vllm/vllm-openai:latest --model mistralai/Mistral-7B-Instruct-v0.3" `
    --tags "vllm-server"
} else {
  Write-Host "vLLM VM already exists."
}

Write-Host "Waiting for vLLM IP..."
$VLLM_IP = gcloud compute instances list --project "$PROJECT_ID" --filter="name=$VLLM_INSTANCE" --format='value(networkInterfaces[0].networkIp)'
Write-Host "vLLM Internal IP: $VLLM_IP"

# --- Step 4: Deploy App ---
Write-Host "[Step 4] Deploying Next.js App to Cloud Run..."

if (-not (gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --project "$PROJECT_ID" 2>$null)) {
  Write-Host "Creating Artifact Registry repository..."
  gcloud artifacts repositories create "$REPO_NAME" `
    --repository-format=docker `
    --location="$REGION" `
    --description="Pandora Docker Repository" `
    --project "$PROJECT_ID"
}

$IMAGE_URI = "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME`:latest"

Write-Host "Building Container Image (Cloud Build)..."
gcloud builds submit --tag "$IMAGE_URI" --project "$PROJECT_ID"

Write-Host "Deploying Service..."
gcloud run deploy "$SERVICE_NAME" `
  --image "$IMAGE_URI" `
  --region "$REGION" `
  --platform managed `
  --allow-unauthenticated `
  --vpc-connector "projects/$PROJECT_ID/locations/$REGION/connectors/$CONNECTOR_NAME" `
  --set-env-vars "INFERENCE_URL=http://$VLLM_IP`:8000/v1" `
  --set-env-vars "INFERENCE_MODEL=mistralai/Mistral-7B-Instruct-v0.3" `
  --set-env-vars "QDRANT_URL=http://$QDRANT_IP`:6333" `
  --set-env-vars "EMBEDDING_MODEL=all-MiniLM-L6-v2" `
  --set-env-vars "FIREBASE_PROJECT_ID=$PROJECT_ID" `
  --service-account "pandora-cloudrun-sa@$PROJECT_ID.iam.gserviceaccount.com" `
  --project "$PROJECT_ID"

# --- Verification ---
Write-Host "==================================================="
Write-Host "   DEPLOYMENT COMPLETE"
Write-Host "==================================================="
$SERVICE_URL = gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)' --project "$PROJECT_ID"
Write-Host "App Public URL:   $SERVICE_URL"
Write-Host "Qdrant Internal:  $QDRANT_IP:6333"
Write-Host "vLLM Internal:    $VLLM_IP:8000"
Write-Host "==================================================="


