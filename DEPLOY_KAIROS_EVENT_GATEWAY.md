# 🚀 Deploy Kairos Event Gateway - Quick Start

## One Command Deployment (Cloud Shell)

From **repo root** in Google Cloud Shell:

```bash
export PROJECT_ID=seismic-vista-480710-q5
export REGION=asia-southeast1

gcloud run deploy kairos-event-gateway \
  --source=services/kairos-event-gateway \
  --region=${REGION} \
  --allow-unauthenticated=false \
  --set-env-vars=BASE44_INGEST_URL=https://kairostrack.base44.app/functions/ingest \
  --set-secrets=KAIROS_INGEST_SECRET=kairos-ingest-secret:latest \
  --service-account=kairos-event-gateway-sa@${PROJECT_ID}.iam.gserviceaccount.com
```

## Prerequisites

1. **kairos-ingest-secret** must exist in Secret Manager
   - Value must match Base44's ingest secret
   - Create if needed: `echo "SECRET_VALUE" | gcloud secrets create kairos-ingest-secret --data-file=-`

2. **Service account** must exist (created automatically if using `--source`)

3. **APIs enabled**: Cloud Run, Secret Manager, Cloud Build

## What It Does

1. ✅ Builds container from source
2. ✅ Deploys to Cloud Run
3. ✅ Binds `KAIROS_INGEST_SECRET` from Secret Manager
4. ✅ Sets Base44 ingest URL
5. ✅ Requires IAM authentication (secure by default)

## Output

After deployment, you'll get:
- **Service URL**: `https://kairos-event-gateway-xxx-xx.a.run.app`

## Grant Producer Access

For each producer (GitHub Actions, Linear scripts, etc.), grant IAM access:

```bash
# Example: GitHub Actions service account
gcloud run services add-iam-policy-binding kairos-event-gateway \
  --region=${REGION} \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

## Usage

Producers send events to the gateway:

```bash
# Get identity token
TOKEN=$(gcloud auth print-identity-token)

# Send event
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dedupeKey": "github:pr:123:opened",
    "source": "github",
    "action": "pr.opened",
    "refType": "pr",
    "refId": "123",
    "link": "https://github.com/org/repo/pull/123"
  }' \
  https://kairos-event-gateway-xxx.a.run.app/v1/event
```

The gateway:
- ✅ Receives event from producer
- ✅ Adds timestamp/schemaVersion if missing
- ✅ Signs event with `KAIROS_INGEST_SECRET`
- ✅ Forwards to Base44 ingest with `X-Signature` header

## Architecture

```
Producer (GitHub/Linear/etc.)
    ↓ IAM Auth
Cloud Run Gateway (this service)
    ↓ HMAC Signed
Base44 Ingest
```

**Only the gateway knows the secret** - producers never see it!

## Documentation

- **Full Deployment Guide**: `services/kairos-event-gateway/DEPLOYMENT.md`
- **Service README**: `services/kairos-event-gateway/README.md`

## Security Notes

- ✅ `allow-unauthenticated=false` - Producers must use IAM auth
- ✅ Secret stored in GCP Secret Manager (single source of truth)
- ✅ Gateway handles signing (producers never see secret)
- ✅ Base44 verifies signature using same secret

---

**Ready?** Just run the deploy command above! 🚀

