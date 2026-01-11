#!/bin/bash
# Deploy Kairos Secrets Broker to Cloud Run
# Run from repo root

set -e

# Set your constants here
PROJECT_ID="${PROJECT_ID:-seismic-vista-480710-q5}"
REGION="${REGION:-asia-southeast1}"
REPO="${REPO:-kairos}"
SERVICE_NAME="kairos-secrets-broker"
SERVICE_ACCOUNT="${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🚀 Deploying Kairos Secrets Broker"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Repository: ${REPO}"
echo ""

# Set project
gcloud config set project "${PROJECT_ID}"

# 1) Enable APIs (idempotent)
echo "📦 Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --quiet

# 2) Create service account (idempotent - will fail if exists, that's ok)
echo "👤 Creating service account..."
gcloud iam service-accounts create "${SERVICE_NAME}-sa" \
  --display-name="Kairos Secrets Broker SA" \
  --description="Service account for Kairos Secrets Broker" \
  2>/dev/null || echo "  (Service account already exists, continuing...)"

# 3) Create Artifact Registry repo (idempotent)
echo "📦 Creating Artifact Registry repository..."
gcloud artifacts repositories create "${REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  2>/dev/null || echo "  (Repository already exists, continuing...)"

# 4) Build & push image
echo "🔨 Building container image..."
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE_NAME}:latest"

gcloud builds submit \
  --tag "${IMAGE_TAG}" \
  --file services/kairos-secrets-broker/Dockerfile \
  .

# 5) Grant service account access to secrets
echo "🔐 Granting Secret Manager access..."
echo "  Note: You need to grant access to each secret individually:"
echo "  gcloud secrets add-iam-policy-binding SECRET_NAME \\"
echo "    --member=\"serviceAccount:${SERVICE_ACCOUNT}\" \\"
echo "    --role=\"roles/secretmanager.secretAccessor\""
echo ""
echo "  Required secrets:"
echo "    - kairos-bootstrap-secret (required)"
echo "    - linear-api-key"
echo "    - tavily-api-key"
echo "    - chatgpt-api-key"
echo "    - openai-api-key"
echo "    - (any others configured in config.ts)"

# 6) Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_TAG}" \
  --region "${REGION}" \
  --service-account "${SERVICE_ACCOUNT}" \
  --allow-unauthenticated \
  --set-secrets KAIROS_BOOTSTRAP_SECRET=kairos-bootstrap-secret:latest \
  --set-env-vars GOOGLE_CLOUD_PROJECT="${PROJECT_ID}",NODE_ENV=production \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 30s \
  --platform managed

# 7) Get service URL
echo ""
echo "✅ Deployment complete!"
echo ""
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --format="value(status.url)")

echo "📍 Service URL: ${SERVICE_URL}"
echo ""
echo "🔍 Verify deployment:"
echo "  curl ${SERVICE_URL}/health"
echo ""
echo "📋 Next steps:"
echo "  1. Grant service account access to secrets (see commands above)"
echo "  2. Store KAIROS_BOOTSTRAP_SECRET in Base44"
echo "  3. Store KAIROS_SECRETS_BROKER_URL=${SERVICE_URL} in Base44"
echo "  4. Use the Base44 client snippet from docs/12_SECRETS_SPINE.md"

