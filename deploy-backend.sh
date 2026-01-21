#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

PROJECT_ID="seismic-vista-480710-q5" # Replace with your Google Cloud Project ID
SERVICE_NAME="pandora-backend"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "Building Docker image for the backend..."
gcloud builds submit --tag ${IMAGE_NAME} ./backend

echo "Deploying ${SERVICE_NAME} to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --project ${PROJECT_ID}

echo "Deployment complete!"
