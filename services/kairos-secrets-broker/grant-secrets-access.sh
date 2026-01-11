#!/bin/bash
# Grant service account access to Secret Manager secrets
# Run this after deploy.sh

set -e

PROJECT_ID="${PROJECT_ID:-seismic-vista-480710-q5}"
SERVICE_NAME="kairos-secrets-broker"
SERVICE_ACCOUNT="${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# List of secrets the broker needs access to
SECRETS=(
  "kairos-bootstrap-secret"  # Required for HMAC verification
  "linear-api-key"
  "tavily-api-key"
  "chatgpt-api-key"
  "openai-api-key"
  # Add more secrets as needed based on scripts/kairos.secrets.config.ts
)

echo "🔐 Granting Secret Manager access to ${SERVICE_ACCOUNT}"
echo ""

for SECRET in "${SECRETS[@]}"; do
  echo "Granting access to: ${SECRET}"
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet || echo "  (Already has access or secret doesn't exist)"
done

echo ""
echo "✅ Done! Service account now has access to the listed secrets."

