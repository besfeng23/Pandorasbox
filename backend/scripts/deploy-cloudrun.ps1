# PowerShell script to deploy Pandora's Box to Cloud Run

# Exit immediately if a command exits with a non-zero status.
$ErrorActionPreference = "Stop"

$PROJECT_ID = (gcloud config get-value project)
$REGION = "us-central1"
$SERVICE_NAME = "pandora-chat-app"
$IMAGE_URI = "${REGION}-docker.pkg.dev/${PROJECT_ID}/pandora/${SERVICE_NAME}:latest"
$VPC_CONNECTOR_NAME = "pandora-vpc-connector"
$SERVICE_ACCOUNT_EMAIL = "pandora-cloudrun-sa@${PROJECT_ID}.iam.gserviceaccount.com"
$QDRANT_URL = "http://10.128.0.7:6333"
$EMBEDDINGS_BASE_URL = "http://localhost:8080"
$INFERENCE_BASE_URL = "http://localhost:8000"

# Deploy to Cloud Run
Write-Host "Deploying ${SERVICE_NAME} to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" `
  --image "${IMAGE_URI}" `
  --region "${REGION}" `
  --platform managed `
  --allow-unauthenticated `
  --service-account "${SERVICE_ACCOUNT_EMAIL}" `
  --vpc-connector projects/${PROJECT_ID}/locations/${REGION}/connectors/${VPC_CONNECTOR_NAME} `
  --vpc-egress private-ranges-only `
  --set-env-vars FIREBASE_PROJECT_ID="${PROJECT_ID}",QDRANT_URL="${QDRANT_URL}",EMBEDDINGS_BASE_URL="${EMBEDDINGS_BASE_URL}",INFERENCE_BASE_URL="${INFERENCE_BASE_URL}"

Write-Host "Cloud Run deployment complete."

# Print Cloud Run URL
Write-Host "Retrieving Cloud Run service URL..."
$SERVICE_URL = (gcloud run services describe "${SERVICE_NAME}" `
  --platform managed `
  --region "${REGION}" `
  --format="value(status.url)")

Write-Host "Cloud Run Service URL: ${SERVICE_URL}"

Write-Host "Environment Variables Set:"
Write-Host "  FIREBASE_PROJECT_ID=${PROJECT_ID}"
Write-Host "  QDRANT_URL=${QDRANT_URL}"
Write-Host "  EMBEDDINGS_BASE_URL=${EMBEDDINGS_BASE_URL}"
Write-Host "  INFERENCE_BASE_URL=${INFERENCE_BASE_URL}"

Write-Host "Note: vLLM inference VM is not deployed yet. INFERENCE_BASE_URL is temporarily set to localhost."

