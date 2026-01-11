#!/bin/bash
# Verify Kairos Secrets Broker deployment

set -e

REGION="${REGION:-asia-southeast1}"
SERVICE_NAME="kairos-secrets-broker"

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --format="value(status.url)" 2>/dev/null)

if [ -z "${SERVICE_URL}" ]; then
  echo "❌ Service not found. Make sure it's deployed first."
  exit 1
fi

echo "🔍 Verifying Kairos Secrets Broker"
echo "URL: ${SERVICE_URL}"
echo ""

# 1) Health check
echo "1️⃣  Health check..."
HEALTH=$(curl -s "${SERVICE_URL}/health")
echo "   Response: ${HEALTH}"
if echo "${HEALTH}" | grep -q "ok"; then
  echo "   ✅ Health check passed"
else
  echo "   ❌ Health check failed"
  exit 1
fi

echo ""

# 2) Test 401 without signature
echo "2️⃣  Testing 401 (missing signature)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${SERVICE_URL}/v1/secrets/bundle" \
  -H "Content-Type: application/json" \
  -d '{"target":"base44","secrets":["linear-api-key"]}')
if [ "${STATUS}" = "401" ]; then
  echo "   ✅ Returns 401 without signature (correct)"
else
  echo "   ❌ Expected 401, got ${STATUS}"
fi

echo ""

# 3) Test 400 with invalid timestamp
echo "3️⃣  Testing 400 (invalid timestamp)..."
OLD_TIMESTAMP=$(( $(date +%s) - 600 ))000  # 10 minutes ago
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${SERVICE_URL}/v1/secrets/bundle" \
  -H "Content-Type: application/json" \
  -H "X-Kairos-Timestamp: ${OLD_TIMESTAMP}" \
  -H "X-Kairos-Signature: fake" \
  -d '{"target":"base44","secrets":["linear-api-key"]}')
if [ "${STATUS}" = "401" ] || [ "${STATUS}" = "400" ]; then
  echo "   ✅ Returns ${STATUS} with old timestamp (correct)"
else
  echo "   ⚠️  Got ${STATUS} (expected 401 or 400)"
fi

echo ""
echo "✅ Basic verification complete!"
echo ""
echo "📋 Manual testing with valid signature:"
echo "  See docs/12_SECRETS_SPINE.md for Base44 client snippet"
echo ""
echo "💡 To test with real signature, you need:"
echo "  1. KAIROS_BOOTSTRAP_SECRET value"
echo "  2. Generate HMAC signature (see docs for example)"

