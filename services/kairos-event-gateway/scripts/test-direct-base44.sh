#!/bin/bash
# Test direct Base44 signature verification
# This bypasses the gateway and tests if GCP secret matches Base44 secret
# Run in Cloud Shell from repo root

set -e

PROJECT_ID=${PROJECT_ID:-seismic-vista-480710-q5}
SECRET_NAME="kairos-ingest-secret"
BASE44_URL="${BASE44_INGEST_URL:-https://kairostrack.base44.app/functions/ingest}"

echo "🧪 Testing direct Base44 signature verification"
echo "📍 Base44 URL: $BASE44_URL"
echo ""

# Get secret from GCP
echo "🔐 Fetching secret from GCP..."
SECRET=$(gcloud secrets versions access latest --secret=$SECRET_NAME)

echo "✅ Secret retrieved (${#SECRET} chars)"
echo ""

# Create test event body
BODY='{"timestamp":"2026-01-11T05:52:43.305Z","schemaVersion":1,"dedupeKey":"debug:direct:'$(date +%s)'","source":"debug","actor":"shell","module":"sig","action":"direct.test","status":"ok","severity":"low"}'

echo "📝 Test event:"
echo "$BODY" | python3 -m json.tool
echo ""

# Calculate HMAC signature
echo "🔐 Calculating HMAC signature..."
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | openssl base64 -A)

echo "✅ Signature calculated"
echo ""

# Send to Base44
echo "📨 Sending to Base44..."
HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/base44-response.json \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG" \
  --data "$BODY" \
  "$BASE44_URL")

RESPONSE=$(cat /tmp/base44-response.json)
rm -f /tmp/base44-response.json

echo ""
if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "✅ SUCCESS! Base44 accepted the signature (HTTP $HTTP_CODE)"
  echo "   Response: $RESPONSE"
  echo ""
  echo "🎉 GCP secret matches Base44 secret!"
  exit 0
else
  echo "❌ FAILED! Base44 rejected the signature (HTTP $HTTP_CODE)"
  echo "   Response: $RESPONSE"
  echo ""
  echo "💡 This means GCP secret ≠ Base44 secret"
  echo "   Check Base44 Secrets → KAIROS_INGEST_SECRET value"
  exit 1
fi

