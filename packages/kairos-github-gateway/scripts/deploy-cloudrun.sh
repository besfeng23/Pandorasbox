#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   GCP_PROJECT=... REGION=... SERVICE_NAME=... KAIROS_BASE_URL=... GITHUB_WEBHOOK_SECRET=... ./scripts/deploy-cloudrun.sh
#
# Optional:
#   KAIROS_INGEST_SECRET=...
#   ALLOWED_REPOS=owner/repo,owner2/repo2
#

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${GCP_PROJECT:?Missing GCP_PROJECT}"
: "${REGION:?Missing REGION}"
: "${SERVICE_NAME:?Missing SERVICE_NAME}"
: "${KAIROS_BASE_URL:?Missing KAIROS_BASE_URL}"
: "${GITHUB_WEBHOOK_SECRET:?Missing GITHUB_WEBHOOK_SECRET}"

ENV_VARS="KAIROS_BASE_URL=${KAIROS_BASE_URL},GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}"

if [[ -n "${KAIROS_INGEST_SECRET:-}" ]]; then
  ENV_VARS="${ENV_VARS},KAIROS_INGEST_SECRET=${KAIROS_INGEST_SECRET}"
fi

if [[ -n "${ALLOWED_REPOS:-}" ]]; then
  ENV_VARS="${ENV_VARS},ALLOWED_REPOS=${ALLOWED_REPOS}"
fi

gcloud config set project "$GCP_PROJECT"

gcloud run deploy "$SERVICE_NAME" \
  --region "$REGION" \
  --source . \
  --allow-unauthenticated \
  --set-env-vars "$ENV_VARS"

echo ""
echo "Deployed. Now configure GitHub webhook to:"
echo "  https://<cloud-run-url>/webhooks/github"


