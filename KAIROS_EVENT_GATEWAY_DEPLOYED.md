# ✅ Kairos Event Gateway - Successfully Deployed!

## Service URL

**Service URL:** `https://kairos-event-gateway-536979070288.asia-southeast1.run.app`

## Status

✅ **Deployed Successfully**
- Region: `asia-southeast1`
- Service Account: `kairos-event-gateway-sa@seismic-vista-480710-q5.iam.gserviceaccount.com`
- Authentication: IAM required (`--no-allow-unauthenticated`)
- Secrets: `KAIROS_INGEST_SECRET` bound from Secret Manager
- Environment: `BASE44_INGEST_URL` set to `https://kairostrack.base44.app/functions/ingest`

## Quick Test

### Health Check

```bash
curl https://kairos-event-gateway-536979070288.asia-southeast1.run.app/healthz
```

Expected response:
```json
{"ok":true,"service":"kairos-event-gateway"}
```

### Send Test Event (Requires IAM Auth)

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
  https://kairos-event-gateway-536979070288.asia-southeast1.run.app/v1/event
```

## Next Steps

### 1. Grant IAM Access to Producers

For each producer that needs to send events:

```bash
gcloud run services add-iam-policy-binding kairos-event-gateway \
  --region=asia-southeast1 \
  --member="serviceAccount:YOUR_PRODUCER_SA@seismic-vista-480710-q5.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### 2. Test from GitHub Actions / Linear / etc.

Once IAM access is granted, producers can send events:

```typescript
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth();
const client = await auth.getIdTokenClient(
  'https://kairos-event-gateway-536979070288.asia-southeast1.run.app'
);

await client.request({
  url: 'https://kairos-event-gateway-536979070288.asia-southeast1.run.app/v1/event',
  method: 'POST',
  data: {
    dedupeKey: 'github:pr:123:opened',
    source: 'github',
    action: 'pr.opened',
    // ... other event fields
  },
});
```

## Architecture

```
Producer (GitHub/Linear/etc.)
    ↓ IAM Auth
Cloud Run Gateway (this service)
    ↓ HMAC Signed with KAIROS_INGEST_SECRET
Base44 Ingest
```

**Only the gateway knows the secret** - producers never see it!

## Documentation

- **Full Deployment Guide**: `services/kairos-event-gateway/DEPLOYMENT.md`
- **Service README**: `services/kairos-event-gateway/README.md`
- **Quick Deploy Guide**: `DEPLOY_KAIROS_EVENT_GATEWAY.md`

---

**Deployment Date:** 2026-01-11
**Fix Applied:** Changed `npm ci` to `npm install` in Dockerfile (no package-lock.json)

