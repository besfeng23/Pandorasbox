# Kairos Event Gateway

Cloud Run service that receives events from producers (GitHub, Linear, Firebase, etc.) and forwards them to Base44 ingest endpoint with proper HMAC signature.

## Overview

**Problem:** Producers need to sign events to Base44 ingest, but we don't want to distribute secrets everywhere.

**Solution:** This gateway receives events from producers (via IAM auth) and handles signing + forwarding to Base44.

**Benefits:**
- ✅ Only Cloud Run knows `KAIROS_INGEST_SECRET`
- ✅ Producers use IAM authentication (no shared secrets)
- ✅ Single source of truth: GCP Secret Manager
- ✅ Easy to add new producers (just grant IAM access)

## Architecture

```
┌─────────┐    IAM Auth    ┌──────────────────┐    HMAC Signed    ┌─────────┐
│ GitHub  │ ────────────► │ kairos-event-    │ ───────────────► │ Base44  │
│ Actions │                │ gateway          │                  │ Ingest  │
└─────────┘                │ (Cloud Run)      │                  └─────────┘
                           │                  │
┌─────────┐                │ Reads:           │
│ Linear  │ ────────────► │ KAIROS_INGEST_   │
│ Scripts │                │ SECRET from      │
└─────────┘                │ Secret Manager   │
                           └──────────────────┘
┌─────────┐
│ Firebase│ ────────────►
│ Cloud   │
│ Scheduler│
└─────────┘
```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `BASE44_INGEST_URL` - Base44 ingest endpoint (default: `https://kairostrack.base44.app/functions/ingest`)
- `KAIROS_INGEST_SECRET` - HMAC secret for signing (from Secret Manager)

## Development

```bash
# Install dependencies
npm install

# Run in development mode (requires KAIROS_INGEST_SECRET env var)
KAIROS_INGEST_SECRET=your-secret npm run dev

# Build
npm run build

# Run production build
npm start

# Send test event to local dev server
npm run test:event

# Send test event to deployed service (requires IAM auth)
USE_IAM_AUTH=true GATEWAY_URL=https://your-service.run.app npm run test:event

# Send specific event types
npm run test:event github   # GitHub PR event
npm run test:event linear   # Linear issue event
npm run test:event firebase # Firebase deployment event

# Helper scripts (Cloud Shell)
./scripts/rotate-secret.sh         # Rotate secret without newlines
./scripts/test-direct-base44.sh    # Test if GCP secret matches Base44
```

## Deployment

See `DEPLOYMENT.md` for deployment instructions.

## API

### POST /v1/event

Receive event from producer and forward to Base44 ingest.

**Request Body:**
```json
{
  "timestamp": "2026-01-11T05:52:43.305Z",
  "schemaVersion": 1,
  "dedupeKey": "github:pr:123:opened",
  "source": "github",
  "actor": "octocat",
  "module": "code",
  "action": "pr.opened",
  "status": "ok",
  "severity": "low",
  "refType": "pr",
  "refId": "123",
  "link": "https://github.com/org/repo/pull/123",
  "tags": ["feature", "ui"],
  "metadata": { "repo": "frontend", "author": "octocat" }
}
```

**Response (200 OK):**
```json
{
  "ok": true
}
```

**Response (502 Bad Gateway):**
```json
{
  "ok": false,
  "upstreamStatus": 400,
  "upstreamBody": "..."
}
```

### GET /healthz

Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "service": "kairos-event-gateway"
}
```

## Event Normalization

The gateway automatically:
- Adds `timestamp` if missing (ISO 8601 format)
- Adds `schemaVersion: 1` if missing

## Security

- ✅ Producers authenticate via IAM (Cloud Run service accounts)
- ✅ Gateway requires IAM authentication (`--no-allow-unauthenticated`)
- ✅ Gateway signs events with `KAIROS_INGEST_SECRET` from Secret Manager
- ✅ Base44 verifies signature using same secret
- ✅ No secrets distributed to producers
- ✅ Secret trimmed to eliminate trailing newline/whitespace issues
- ✅ HMAC signature computed on exact UTF-8 body that is sent

## Usage Example

### From GitHub Actions

```yaml
- name: Send event to Kairos
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}

- name: Send event
  run: |
    curl -X POST \
      -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
      -H "Content-Type: application/json" \
      -d '{
        "dedupeKey": "github:pr:${{ github.event.pull_request.number }}:opened",
        "source": "github",
        "action": "pr.opened",
        "refType": "pr",
        "refId": "${{ github.event.pull_request.number }}",
        "link": "${{ github.event.pull_request.html_url }}"
      }' \
      https://kairos-event-gateway-xxx.a.run.app/v1/event
```

### From Node.js Script

```typescript
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth();
const client = await auth.getIdTokenClient('https://kairos-event-gateway-xxx.a.run.app');

const response = await client.request({
  url: 'https://kairos-event-gateway-xxx.a.run.app/v1/event',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  data: {
    dedupeKey: 'linear:issue:123:created',
    source: 'linear',
    action: 'issue.created',
    // ...
  },
});
```

## Troubleshooting

### 502 Bad Gateway (with "Invalid or missing signature" from Base44)

- **Most common cause:** Secret mismatch (GCP secret ≠ Base44 secret)
- **Solution:** Use `./scripts/test-direct-base44.sh` to verify secret matches
- **If mismatch:** Rotate secret using `./scripts/rotate-secret.sh` and update Base44
- Check Base44 ingest endpoint is accessible
- Check Base44 logs for signature verification errors

### 401 Unauthorized

- Verify producer has IAM access to Cloud Run service
- Check service account permissions

### Events not appearing in Base44

- Verify `dedupeKey` is stable and unique
- Check Base44 logs for errors
- Verify signature calculation matches Base44 expectations

