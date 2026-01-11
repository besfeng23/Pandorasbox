# Kairos Secrets Spine

## Overview

The **Kairos Secrets Spine** provides a secure mechanism for distributing secrets to trusted external callers. GCP Secret Manager is the single source of truth, and the broker service provides short-lived secret bundles with strong authentication.

## Architecture Patterns

### Pattern A: Cloud Run Mounts Secrets (Direct)

For services running on Cloud Run within the same GCP project, secrets can be mounted directly as environment variables.

**Configuration** (`apphosting.yaml`):
```yaml
env:
  - variable: SECRET_NAME
    secret: secret-name-in-gcp
    availability:
      - RUNTIME
```

**Pros:**
- Simple, native GCP integration
- No additional service required
- Secrets available as environment variables

**Cons:**
- Only works for services in the same GCP project
- Requires redeployment to update secrets
- No fine-grained access control per service

### Pattern B: Secrets Broker (for External Services)

For external services like Base44 that cannot directly access GCP Secret Manager, use the `kairos-secrets-broker` service.

**Flow:**
1. External caller stores ONLY one bootstrap secret
2. Caller requests secret bundle via authenticated API
3. Broker verifies HMAC signature and replay protection
4. Broker returns short-lived bundle (15-minute TTL)
5. Caller caches bundle locally for 15 minutes

**Pros:**
- Works for external services (Base44, third-party integrations)
- Fine-grained access control per target
- Short-lived bundles reduce exposure window
- Centralized audit trail

**Cons:**
- Additional service to maintain
- Requires network call (but can be cached)
- More complex authentication setup

## Deployment

### Quick Deploy

See `DEPLOY_KAIROS_SECRETS_BROKER.md` in repo root for one-command deployment.

### Manual Deployment

See `services/kairos-secrets-broker/DEPLOYMENT.md` for step-by-step instructions.

## API Reference

### POST /v1/secrets/bundle

Request a secret bundle for a target.

**Headers:**
- `Content-Type: application/json`
- `X-Kairos-Signature`: Base64-encoded HMAC-SHA256 signature
- `X-Kairos-Timestamp`: Unix timestamp in milliseconds

**Request Body:**
```json
{
  "target": "base44",
  "secrets": ["linear-api-key", "tavily-api-key"]
}
```

**Response (200 OK):**
```json
{
  "schemaVersion": "1.0.0",
  "expiresAt": "2025-01-15T10:30:00.000Z",
  "secrets": {
    "linear-api-key": "...",
    "tavily-api-key": "..."
  }
}
```

**Note:** Secret names in the request must match GCP Secret Manager secret names (typically kebab-case like `linear-api-key`).

**Error Responses:**
- `400 Bad Request`: Invalid request format
- `401 Unauthorized`: Invalid signature or replay protection failed
- `500 Internal Server Error`: Server error

### Signature Generation

The signature is computed as:
```
signature = base64(HMAC_SHA256(BOOTSTRAP_SECRET, `${timestamp}.${rawBody}`))
```

Where:
- `timestamp` is Unix timestamp in milliseconds (same value as `X-Kairos-Timestamp` header)
- `rawBody` is the raw JSON request body as string
- `BOOTSTRAP_SECRET` is the shared secret

**Example (Node.js):**
```typescript
import { createHmac } from 'crypto';

const timestamp = Date.now().toString();
const rawBody = JSON.stringify({ target: 'base44', secrets: ['linear-api-key'] });
const message = `${timestamp}.${rawBody}`;

const hmac = createHmac('sha256', BOOTSTRAP_SECRET);
hmac.update(message);
const signature = hmac.digest('base64');
```

### Replay Protection

Requests are protected against replay attacks:
- Timestamp must be within ±5 minutes of server time
- Server rejects requests outside this window

## Base44 Integration

See `docs/12_BASE44_INTEGRATION.md` for complete Base44 integration guide and client snippet.

## Security Considerations

### Never Log Secrets

- The broker service never logs secret values
- Error messages never include secret names or values
- Only log error codes and generic messages
- Client code should never log secret values

### Deterministic Responses

- Response JSON keys are sorted alphabetically
- Only `expiresAt` timestamp is included (no request timestamps)
- Schema version included for API compatibility

### Access Control

- **Deny by default**: Only explicitly configured secrets are allowed
- Per-target allowlists prevent over-privileged access
- Configuration in `scripts/kairos.secrets.config.ts`

### Short-Lived Bundles

- Bundles expire after 15 minutes
- Callers should cache bundles locally (max 15 minutes)
- Reduces exposure window if bundle is compromised

### Bootstrap Secret Management

- Bootstrap secret is stored in GCP Secret Manager
- Rotate bootstrap secret periodically
- Distribute to external callers securely (not via email/chat)

## Monitoring

### Recommended Metrics

- Request count by target
- Authentication failures
- Replay protection rejections
- Secret fetch errors (without secret names)

### Logging

- Log authentication failures (without details)
- Log request targets (without secret names)
- Log error codes (never log secret values)

### Alerting

- Alert on high authentication failure rate
- Alert on service errors
- Alert on replay protection failures (potential attack)

## Troubleshooting

### 401 Unauthorized

1. Verify bootstrap secret matches on both sides
2. Check timestamp is current (within ±5 minutes)
3. Verify signature calculation matches specification
4. Ensure raw body matches exactly (whitespace, encoding)

### Secrets Missing from Response

1. Check `scripts/kairos.secrets.config.ts` allows secret for target
2. Verify secret exists in GCP Secret Manager
3. Check service account has Secret Manager access

### Deployment Issues

1. Verify service account has Secret Manager role
2. Check `KAIROS_BOOTSTRAP_SECRET` is set correctly
3. Verify Cloud Run service can access secrets

## Best Practices

1. **Rotate bootstrap secrets** every 90 days
2. **Monitor authentication failures** for potential attacks
3. **Use least privilege** - only allow necessary secrets per target
4. **Cache bundles client-side** to reduce API calls
5. **Implement retry logic** with exponential backoff
6. **Validate bundle expiry** before using secrets
7. **Never commit bootstrap secrets** to version control
8. **Use HTTPS only** for broker communication

## Deduplication Keys

For event ingestion systems that use the broker:

- Generate `dedupeKey` as: `SHA256(target + secretName + expiresAt)`
- Include `dedupeKey` in event metadata
- Use for idempotency checks in downstream systems

Example:
```typescript
import { createHash } from 'crypto';

function generateDedupeKey(target: string, secretName: string, expiresAt: string): string {
  const input = `${target}:${secretName}:${expiresAt}`;
  return createHash('sha256').update(input).digest('hex');
}

// Usage in event ingestion:
const bundle = await client.getBundle('base44', ['linear-api-key']);
const dedupeKey = generateDedupeKey('base44', 'linear-api-key', bundle.expiresAt);
// Include dedupeKey in event metadata for idempotency
```
