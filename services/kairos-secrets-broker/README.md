# Kairos Secrets Broker

Cloud Run service for secure secret distribution to trusted external callers.

## Features

- **HMAC Signature Verification**: Strong authentication using HMAC-SHA256
- **Replay Protection**: Timestamp validation (±5 minutes)
- **Per-Target Allowlists**: Deny by default, allow only configured secrets
- **Short-Lived Bundles**: 15-minute TTL reduces exposure window
- **Deterministic Responses**: Stable JSON key order, schema versioning
- **Never Log Secrets**: Service never logs secret values or names

## Quick Start

### Deploy to Cloud Run

**One command from repo root:**

```powershell
.\services\kairos-secrets-broker\deploy.ps1
```

See `QUICK_DEPLOY.md` for details.

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run production build
npm start
```

### Configuration

Edit `scripts/kairos.secrets.config.ts` to configure allowed secrets per target.

**Important:** After updating `scripts/kairos.secrets.config.ts`, you must also update `src/config.ts` in the service folder to match. Both files should contain the same configuration. (Future: automate this sync with a build script.)

### Environment Variables

- `PORT`: Server port (default: 8080)
- `GOOGLE_CLOUD_PROJECT`: GCP project ID
- `KAIROS_BOOTSTRAP_SECRET`: Shared secret for HMAC verification

### Deployment

See `docs/12_SECRETS_SPINE.md` for full deployment instructions.

## API

See `docs/12_SECRETS_SPINE.md` for complete API documentation.

## Security

- Never logs secrets or secret names
- HMAC signature verification required
- Replay protection enabled
- Per-target secret allowlists
- Short-lived bundles (15 minutes)

