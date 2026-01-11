# Deploy from Cloud Shell - Quick Guide

## Step 1: Get Your Code into Cloud Shell

You have a few options:

### Option A: Clone from Git (if repo is on GitHub/GitLab/etc)

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Continue with deployment
```

### Option B: Upload Files to Cloud Shell

1. In Cloud Shell, click the **three-dot menu** (⋮) → **Upload file**
2. Upload the `services/kairos-event-gateway` folder
3. Or zip it first and upload the zip, then extract:
   ```bash
   unzip kairos-event-gateway.zip
   ```

### Option C: Create Files Directly in Cloud Shell

If you prefer, you can create the service files directly in Cloud Shell:

```bash
mkdir -p services/kairos-event-gateway/src
cd services/kairos-event-gateway

# Then create files manually or copy-paste from your local machine
```

## Step 2: Deploy Once Files Are Available

Once you have the `services/kairos-event-gateway` directory in Cloud Shell:

```bash
# From repo root
export PROJECT_ID=seismic-vista-480710-q5
export REGION=asia-southeast1

# Verify source directory exists
ls -la services/kairos-event-gateway/src/

# Deploy
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
```

## Quick Check

Before deploying, verify the structure:

```bash
ls -la services/kairos-event-gateway/
# Should see: src/, package.json, tsconfig.json, Dockerfile

ls -la services/kairos-event-gateway/src/
# Should see: index.ts
```

## Alternative: Deploy from Local Machine

If you prefer, you can deploy from your local machine (where you have the files):

```bash
# From your local machine (repo root)
gcloud run deploy kairos-event-gateway \
  --source=services/kairos-event-gateway \
  --region=asia-southeast1 \
  --no-allow-unauthenticated \
  --set-env-vars=BASE44_INGEST_URL=https://kairostrack.base44.app/functions/ingest \
  --set-secrets=KAIROS_INGEST_SECRET=kairos-ingest-secret:latest \
  --service-account=kairos-event-gateway-sa@seismic-vista-480710-q5.iam.gserviceaccount.com \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=30s
```

---

**Current Status:** The service account and secret access are already configured! ✅
You just need to get the source files into Cloud Shell, then deploy.

