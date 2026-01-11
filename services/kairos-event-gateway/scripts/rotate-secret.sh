#!/bin/bash
# Rotate kairos-ingest-secret without newline/whitespace issues
# Run in Cloud Shell from repo root

set -e

PROJECT_ID=${PROJECT_ID:-seismic-vista-480710-q5}
SECRET_NAME="kairos-ingest-secret"

echo "🔄 Rotating $SECRET_NAME (no newlines/whitespace)"
echo ""

# Generate new secret (URL-safe, 48 bytes = 64 chars base64)
NEW_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))")

echo "📝 Generated new secret (${#NEW_SECRET} chars)"
echo ""
echo "🔐 Adding new version to Secret Manager..."

# Use printf '%s' to ensure no trailing newline
printf '%s' "$NEW_SECRET" | gcloud secrets versions add $SECRET_NAME --data-file=-

echo ""
echo "✅ New secret version added!"
echo ""
echo "⚠️  IMPORTANT: Update Base44 Secrets → KAIROS_INGEST_SECRET to match:"
echo ""
echo "$NEW_SECRET"
echo ""
echo "💡 After updating Base44, test with:"
echo "   ./scripts/test-direct-base44.sh"

