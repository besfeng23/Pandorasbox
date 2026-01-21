#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

PROJECT_ID="$(gcloud config get-value project)"
REGION="us-central1"
SERVICE_NAME="pandora-chat-app"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/pandora/${SERVICE_NAME}:latest"
VPC_CONNECTOR_NAME="pandora-vpc-connector"
SERVICE_ACCOUNT_EMAIL="pandora-cloudrun-sa@${PROJECT_ID}.iam.gserviceaccount.com"
QDRANT_URL="http://10.128.0.7:6333"
EMBEDDINGS_BASE_URL="http://localhost:8080"
INFERENCE_BASE_URL="http://localhost:8000"

# Deploy to Cloud Run
echo "Deploying ${SERVICE_NAME} to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_URI}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --service-account "${SERVICE_ACCOUNT_EMAIL}" \
  --vpc-connector projects/${PROJECT_ID}/locations/${REGION}/connectors/${VPC_CONNECTOR_NAME} \
  --vpc-egress private-ranges-only \
  --set-env-vars FIREBASE_PROJECT_ID="${PROJECT_ID}" \
  --set-env-vars QDRANT_URL="${QDRANT_URL}" \
  --set-env-vars EMBEDDINGS_BASE_URL="${EMBEDDINGS_BASE_URL}" \
  --set-env-vars INFERENCE_BASE_URL="${INFERENCE_BASE_URL}"

echo "Cloud Run deployment complete."

# Print Cloud Run URL
echo "Retrieving Cloud Run service URL..."
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --format="value(status.url)")

echo "Cloud Run Service URL: ${SERVICE_URL}"

echo "Environment Variables Set:"
echo "  FIREBASE_PROJECT_ID=${PROJECT_ID}"
echo "  QDRANT_URL=${QDRANT_URL}"
echo "  EMBEDDINGS_BASE_URL=${EMBEDDINGS_BASE_URL}"
echo "  INFERENCE_BASE_URL=${INFERENCE_BASE_URL}"

echo "Note: vLLM inference VM is not deployed yet. INFERENCE_BASE_URL is temporarily set to localhost."

