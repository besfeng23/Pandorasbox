# Deployment Guide - Kairos Secrets Broker

## Prerequisites

1. **GCP Project** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Project owner/admin** permissions (for initial setup)
4. **Secret Manager secrets** created (see GCP_SECRETS_INVENTORY.md)

## Quick Start

```bash
# From repo root
cd services/kairos-secrets-broker

# Set your constants
export PROJECT_ID=seismic-vista-480710-q5
export REGION=asia-southeast1  # or us-central1, etc.
export REPO=kairos

# Deploy
./deploy.sh

# Grant secret access
./grant-secrets-access.sh

# Verify
./verify.sh
```

## Step-by-Step Deployment

### 0) Set Constants

```bash
export PROJECT_ID=seismic-vista-480710-q5
export REGION=asia-southeast1
export REPO=kairos
```

### 1) Enable APIs (One-Time)

```bash
gcloud config set project ${PROJECT_ID}

gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

### 2) Create Service Account

```bash
gcloud iam service-accounts create kairos-secrets-broker-sa \
  --display-name="Kairos Secrets Broker SA" \
  --description="Service account for Kairos Secrets Broker"
```

### 3) Create Bootstrap Secret (If Not Exists)

```bash
# Generate a secure bootstrap secret (32+ bytes recommended)
# Store it securely - Base44 will need this same value
printf "YOUR_BOOTSTRAP_SECRET_HERE" | gcloud secrets create kairos-bootstrap-secret --data-file=-
```

**Important:** The bootstrap secret must be:
- At least 32 bytes (recommended 64+ bytes)
- Randomly generated (use `openssl rand -base64 32`)
- Shared securely with Base44 (not via email/chat)

### 4) Create Artifact Registry Repository

```bash
gcloud artifacts repositories create ${REPO} \
  --repository-format=docker \
  --location=${REGION}
```

### 5) Build & Push Container Image

**Run from repo root:**

```bash
gcloud builds submit \
  --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/kairos-secrets-broker:latest \
  --file services/kairos-secrets-broker/Dockerfile \
  .
```

### 6) Grant Service Account Access to Secrets

Grant access to **only the secrets the broker needs to serve**:

```bash
SERVICE_ACCOUNT=kairos-secrets-broker-sa@${PROJECT_ID}.iam.gserviceaccount.com

# Required: Bootstrap secret
gcloud secrets add-iam-policy-binding kairos-bootstrap-secret \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

# Secrets that Base44 needs (from scripts/kairos.secrets.config.ts)
gcloud secrets add-iam-policy-binding linear-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding tavily-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding chatgpt-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

### 7) Deploy to Cloud Run

```bash
gcloud run deploy kairos-secrets-broker \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/kairos-secrets-broker:latest \
  --region ${REGION} \
  --service-account kairos-secrets-broker-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-secrets KAIROS_BOOTSTRAP_SECRET=kairos-bootstrap-secret:latest \
  --set-env-vars GOOGLE_CLOUD_PROJECT=${PROJECT_ID},NODE_ENV=production \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 30s \
  --platform managed
```

### 8) Get Service URL

```bash
gcloud run services describe kairos-secrets-broker \
  --region ${REGION} \
  --format="value(status.url)"
```

## Verification

### Health Check

```bash
curl https://kairos-secrets-broker-xxx.run.app/health
```

Expected: `{"status":"ok","service":"kairos-secrets-broker"}`

### Test Authentication (Should Return 401)

```bash
curl -X POST https://kairos-secrets-broker-xxx.run.app/v1/secrets/bundle \
  -H "Content-Type: application/json" \
  -d '{"target":"base44","secrets":["linear-api-key"]}'
```

Expected: `{"error":"Authentication failed","code":"UNAUTHORIZED",...}`

## Base44 Configuration

Store these in Base44:

1. **KAIROS_BOOTSTRAP_SECRET**: The same bootstrap secret value
2. **KAIROS_SECRETS_BROKER_URL**: The Cloud Run service URL

See `docs/12_SECRETS_SPINE.md` for the Base44 client snippet.

## Troubleshooting

### Service won't start

- Check service account has Secret Manager access
- Verify `KAIROS_BOOTSTRAP_SECRET` is set correctly
- Check Cloud Run logs: `gcloud run logs read kairos-secrets-broker --region ${REGION}`

### 401 Unauthorized

- Verify bootstrap secret matches on both sides
- Check signature calculation matches specification
- Ensure timestamp is current (within ±5 minutes)

### Secrets missing from response

- Check `scripts/kairos.secrets.config.ts` allows secret for target
- Verify service account has access to the secret
- Check secret exists in Secret Manager

## Cost Estimation

- **Cloud Run**: ~$0.40/million requests (free tier: 2M/month)
- **Secret Manager**: ~$0.06/10,000 access operations
- **Artifact Registry**: ~$0.10/GB/month storage
- **Cloud Build**: ~$0.003/minute build time

Expected monthly cost: **< $5** for low traffic.

## Security Best Practices

1. **Rotate bootstrap secret** every 90 days
2. **Use least privilege** - only grant access to needed secrets
3. **Monitor access** - set up alerts for authentication failures
4. **Use HTTPS only** - Cloud Run enforces this
5. **Keep config in sync** - update both `scripts/kairos.secrets.config.ts` and `src/config.ts`

