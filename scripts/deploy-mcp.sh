#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="pandora-mcp"
REGION="${CLOUD_RUN_REGION:-asia-southeast1}"
ALLOW_UNAUTH="${CLOUD_RUN_ALLOW_UNAUTH:-false}"
REPO="${CLOUD_RUN_ARTIFACT_REPO:-pandora}"

log() { echo "[deploy-mcp] $*"; }

if ! command -v gcloud >/dev/null 2>&1; then
  log "ERROR: gcloud CLI not found. Run: npm run tools:setup"
  exit 1
fi

PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
if [[ -z "$PROJECT_ID" ]]; then
  log "ERROR: gcloud project not set. Run: gcloud config set project <PROJECT_ID>"
  exit 1
fi

log "Project: $PROJECT_ID"
log "Region: $REGION"
log "Service: $SERVICE_NAME"

gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com --quiet

log "Ensuring Artifact Registry repo '$REPO' exists..."
if ! gcloud artifacts repositories describe "$REPO" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPO" --repository-format=docker --location "$REGION" --project "$PROJECT_ID" --quiet
fi

IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE_NAME}:latest"

log "Building & pushing image: $IMAGE_TAG"
gcloud builds submit --tag "$IMAGE_TAG" "services/${SERVICE_NAME}"

AUTH_FLAG="--no-allow-unauthenticated"
if [[ "$ALLOW_UNAUTH" == "true" ]]; then
  AUTH_FLAG="--allow-unauthenticated"
fi

ENV_VARS="APP_ENV=${APP_ENV:-dev},CLOUDRUN_SECRETS_BASE_URL=${CLOUDRUN_SECRETS_BASE_URL:-}"
if [[ -n "${CLOUDRUN_SECRETS_BEARER:-}" ]]; then
  ENV_VARS="${ENV_VARS},CLOUDRUN_SECRETS_BEARER=${CLOUDRUN_SECRETS_BEARER}"
fi

log "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_TAG" \
  --region "$REGION" \
  $AUTH_FLAG \
  --set-env-vars "$ENV_VARS" \
  --platform managed \
  --quiet

URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')"
log "Deployed URL: $URL"



