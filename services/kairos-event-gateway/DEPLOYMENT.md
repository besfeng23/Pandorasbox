# Deployment Guide - Kairos Event Gateway

## Quick Deploy (Cloud Shell Recommended)

From **repo root** in Cloud Shell:

```bash
# Set constants
export PROJECT_ID=seismic-vista-480710-q5
export REGION=asia-southeast1
export SERVICE_NAME=kairos-event-gateway

# Ensure kairos-ingest-secret exists
# (Create if needed - this should match Base44's secret)
echo "YOUR_INGEST_SECRET_HERE" | gcloud secrets create kairos-ingest-secret --data-file=-

# Deploy from source
gcloud run deploy ${SERVICE_NAME} \
  --source=services/${SERVICE_NAME} \
  --region=${REGION} \
  --allow-unauthenticated=false \
  --set-env-vars=BASE44_INGEST_URL=https://kairostrack.base44.app/functions/ingest \
  --set-secrets=KAIROS_INGEST_SECRET=kairos-ingest-secret:latest \
  --service-account=${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=30s

# Get service URL
gcloud run services describe ${SERVICE_NAME} \
  --region=${REGION} \
  --format="value(status.url)"
```

## Prerequisites

1. **GCP Project** with billing enabled
2. **Secret Manager API** enabled
3. **Cloud Run API** enabled
4. **kairos-ingest-secret** created in Secret Manager (must match Base44's secret)

## Step-by-Step Deployment

### 1) Enable APIs

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

### 2) Create Service Account

```bash
gcloud iam service-accounts create kairos-event-gateway-sa \
  --display-name="Kairos Event Gateway SA" \
  --description="Service account for Kairos Event Gateway"
```

### 3) Create Ingest Secret (If Not Exists)

**⚠️ IMPORTANT:** Use `printf '%s'` (not `echo`) to avoid trailing newlines that cause signature mismatches.

```bash
# Option A: Generate new secret (recommended for first-time setup)
python3 -c "import secrets; print(secrets.token_urlsafe(48))" | \
  gcloud secrets create kairos-ingest-secret --data-file=-

# Option B: Use existing Base44 secret (no newlines!)
printf '%s' "YOUR_SECRET_VALUE" | \
  gcloud secrets create kairos-ingest-secret --data-file=-
```

**Important:** 
- The `kairos-ingest-secret` value must **exactly match** the secret Base44 uses for `X-Signature` verification
- Always use `printf '%s'` (never `echo`) to avoid trailing newline issues
- See `scripts/rotate-secret.sh` for safe secret rotation
- See `scripts/test-direct-base44.sh` to verify secret matches Base44

### 4) Grant Service Account Access to Secret

```bash
gcloud secrets add-iam-policy-binding kairos-ingest-secret \
  --member="serviceAccount:kairos-event-gateway-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 5) Deploy to Cloud Run

**Option A: Deploy from Source (Recommended)**

```bash
gcloud run deploy kairos-event-gateway \
  --source=services/kairos-event-gateway \
  --region=asia-southeast1 \
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

**Option B: Build and Deploy Separately**

```bash
# Build container
gcloud builds submit \
  --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/kairos/kairos-event-gateway:latest \
  --file services/kairos-event-gateway/Dockerfile \
  .

# Deploy
gcloud run deploy kairos-event-gateway \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/kairos/kairos-event-gateway:latest \
  --region=asia-southeast1 \
  --no-allow-unauthenticated \
  --set-env-vars=BASE44_INGEST_URL=https://kairostrack.base44.app/functions/ingest \
  --set-secrets=KAIROS_INGEST_SECRET=kairos-ingest-secret:latest \
  --service-account=kairos-event-gateway-sa@${PROJECT_ID}.iam.gserviceaccount.com
```

### 6) Grant IAM Access to Producers

For each producer that needs to send events, grant IAM access:

```bash
# Example: Grant GitHub Actions service account
gcloud run services add-iam-policy-binding kairos-event-gateway \
  --region=${REGION} \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### 7) Get Service URL

```bash
gcloud run services describe kairos-event-gateway \
  --region=${REGION} \
  --format="value(status.url)"
```

## Authentication for Producers

Producers must authenticate using IAM (identity tokens). Examples:

### GitHub Actions

```yaml
- uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}

- run: |
    TOKEN=$(gcloud auth print-identity-token)
    curl -X POST \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"dedupeKey":"github:pr:123:opened",...}' \
      https://kairos-event-gateway-xxx.a.run.app/v1/event
```

### Node.js Script

```typescript
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth();
const client = await auth.getIdTokenClient(
  'https://kairos-event-gateway-xxx.a.run.app'
);

await client.request({
  url: 'https://kairos-event-gateway-xxx.a.run.app/v1/event',
  method: 'POST',
  data: { /* event payload */ },
});
```

## Verification

### Health Check

```bash
curl https://kairos-event-gateway-xxx.a.run.app/healthz
```

Expected: `{"ok":true,"service":"kairos-event-gateway"}`

### Test Event

```bash
# Get identity token
TOKEN=$(gcloud auth print-identity-token)

# Send test event
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dedupeKey": "test:event:123",
    "source": "test",
    "action": "test.event",
    "status": "ok"
  }' \
  https://kairos-event-gateway-xxx.a.run.app/v1/event
```

## Troubleshooting

### "Missing KAIROS_INGEST_SECRET"

- Verify secret exists: `gcloud secrets describe kairos-ingest-secret`
- Check service account has Secret Manager access
- Verify secret binding in Cloud Run: `gcloud run services describe kairos-event-gateway --region=${REGION}`

### 401 Unauthorized from Producers

- Verify producer's service account has `roles/run.invoker` role
- Check identity token is valid: `gcloud auth print-identity-token`

### 502 Bad Gateway

- Check Base44 ingest endpoint is accessible
- Verify `KAIROS_INGEST_SECRET` matches Base44's secret
- Check Base44 logs for signature verification errors
- Verify event payload format matches Base44 expectations

### Events Not Appearing in Base44

- Verify `dedupeKey` is stable and unique
- Check signature calculation matches Base44 expectations
- Review Base44 logs for errors
- Ensure event schema matches Base44 requirements

## Cost Estimation

- **Cloud Run**: ~$0.40/million requests (2M free/month)
- **Secret Manager**: ~$0.06/10K operations
- **Expected monthly cost**: **< $5** for low traffic

## Security Best Practices

1. **Use `--no-allow-unauthenticated`** - Require IAM auth from producers (default behavior)
2. **Rotate `kairos-ingest-secret`** periodically (must coordinate with Base44)
3. **Use least privilege** - Only grant `roles/run.invoker` to needed service accounts
4. **Monitor access** - Set up alerts for authentication failures
5. **Validate event payloads** - Add validation if needed (future enhancement)

## Future Enhancements

- Add event validation (schema enforcement)
- Add rate limiting per producer
- Add event batching for high-volume producers
- Add metrics/monitoring (request count, latency, errors)
- Add request ID tracking for debugging

