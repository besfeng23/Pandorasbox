#!/bin/bash
# Setup Base44 secrets in Google Cloud Secret Manager
# Run this script to create the required secrets in GCP

set -e

PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-seismic-vista-480710-q5}

echo "🔐 Setting up Base44 secrets in Google Cloud Secret Manager"
echo "Project: $PROJECT_ID"
echo ""

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
fi

echo "✅ gcloud CLI found"
echo ""

# Secret 1: Base44 App ID
echo "📝 Setting up base44-app-id secret..."
read -p "Enter your Base44 App ID (e.g., 6962980527a433f05c114277): " app_id

if [ -n "$app_id" ]; then
    # Check if secret exists
    if gcloud secrets describe base44-app-id --project=$PROJECT_ID &>/dev/null; then
        echo "  Secret exists, adding new version..."
        echo -n "$app_id" | gcloud secrets versions add base44-app-id --data-file=- --project=$PROJECT_ID
    else
        echo "  Creating new secret..."
        echo -n "$app_id" | gcloud secrets create base44-app-id --data-file=- --project=$PROJECT_ID
    fi
    
    if [ $? -eq 0 ]; then
        echo "  ✅ base44-app-id secret created/updated"
    else
        echo "  ❌ Failed to create base44-app-id secret"
    fi
else
    echo "  ⚠️  Skipping base44-app-id (empty input)"
fi

echo ""

# Secret 2: Base44 API Key
echo "📝 Setting up base44-api-key secret..."
read -sp "Enter your Base44 API Key: " api_key
echo ""

if [ -n "$api_key" ]; then
    # Check if secret exists
    if gcloud secrets describe base44-api-key --project=$PROJECT_ID &>/dev/null; then
        echo "  Secret exists, adding new version..."
        echo -n "$api_key" | gcloud secrets versions add base44-api-key --data-file=- --project=$PROJECT_ID
    else
        echo "  Creating new secret..."
        echo -n "$api_key" | gcloud secrets create base44-api-key --data-file=- --project=$PROJECT_ID
    fi
    
    if [ $? -eq 0 ]; then
        echo "  ✅ base44-api-key secret created/updated"
    else
        echo "  ❌ Failed to create base44-api-key secret"
    fi
else
    echo "  ⚠️  Skipping base44-api-key (empty input)"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Grant access to your service account:"
echo "   gcloud secrets add-iam-policy-binding base44-app-id --member='serviceAccount:YOUR_SA@$PROJECT_ID.iam.gserviceaccount.com' --role='roles/secretmanager.secretAccessor'"
echo "   gcloud secrets add-iam-policy-binding base44-api-key --member='serviceAccount:YOUR_SA@$PROJECT_ID.iam.gserviceaccount.com' --role='roles/secretmanager.secretAccessor'"
echo ""
echo "2. Test the integration:"
echo "   npm run base44:test"

