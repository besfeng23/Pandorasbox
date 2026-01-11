#!/bin/bash
# Corrected deployment command for kairos-event-gateway
# Run from repo root in Cloud Shell

set -e

export PROJECT_ID=seismic-vista-480710-q5
export REGION=asia-southeast1

echo "🚀 Deploying Kairos Event Gateway"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

# Check if secret exists, create if not
echo "🔐 Checking kairos-ingest-secret..."
if ! gcloud secrets describe kairos-ingest-secret --project=${PROJECT_ID} &>/dev/null; then
    echo "⚠️  Secret not found. You need to create it first with the correct value."
    echo "   Run: echo 'YOUR_SECRET_VALUE' | gcloud secrets create kairos-ingest-secret --data-file=-"
    echo "   (The secret value must match Base44's ingest secret)"
    exit 1
fi

echo "✅ Secret exists"
echo ""

# Create service account if not exists
echo "👤 Creating service account..."
gcloud iam service-accounts create kairos-event-gateway-sa \
  --display-name="Kairos Event Gateway SA" \
  --description="Service account for Kairos Event Gateway" \
  2>/dev/null || echo "  (Service account already exists, continuing...)"

# Grant secret access
echo "🔐 Granting secret access..."
gcloud secrets add-iam-policy-binding kairos-ingest-secret \
  --member="serviceAccount:kairos-event-gateway-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy kairos-event-gateway \
  --source=services/kairos-event-gateway \
  --region=${REGION} \
  --no-allow-unauthenticated \
  --set-env-vars=BASE44_INGEST_URL=https://kairostrack.base44.app/functions/ingest \
  --set-secrets=KAIROS_INGEST_SECRET=kairos-ingest-secret:latest \
  --service-account=kairos-event-gateway-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=30s

echo ""
echo "✅ Deployment complete!"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe kairos-event-gateway \
  --region=${REGION} \
  --format="value(status.url)")

echo "📍 Service URL: ${SERVICE_URL}"
echo ""
echo "🔍 Test health endpoint:"
echo "  curl ${SERVICE_URL}/healthz"
echo ""
echo "📋 Next steps:"
echo "  1. Grant IAM access to producers (GitHub Actions, Linear scripts, etc.)"
echo "  2. Test with a sample event"
echo "  3. Verify events appear in Base44"

