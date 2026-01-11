# Base44 Integration - Kairos Secrets Broker

This guide shows how to integrate Base44 with the Kairos Secrets Broker for secure secret distribution.

## Overview

Base44 stores **only 2 secrets**:
- `KAIROS_SECRETS_BROKER_URL` - Cloud Run service URL
- `KAIROS_BOOTSTRAP_SECRET` - HMAC verification secret

All other secrets are fetched from the broker on-demand and cached for 15 minutes.

## Secret Names Mapping

The broker returns secrets using **GCP Secret Manager names** (kebab-case):
- `linear-api-key` → Access via `secrets["linear-api-key"]`
- `tavily-api-key` → Access via `secrets["tavily-api-key"]`
- `chatgpt-api-key` → Access via `secrets["chatgpt-api-key"]`
- `openai-api-key` → Access via `secrets["openai-api-key"]`

## Base44 Client Snippet

Save this as `kairosSecrets.js` in your Base44 project:

```javascript
// kairosSecrets.js
// Requires Base44 Secrets (or env):
// - KAIROS_SECRETS_BROKER_URL
// - KAIROS_BOOTSTRAP_SECRET
//
// Broker contract:
// POST { brokerUrl }/v1/secrets/bundle
// Headers:
//   X-Kairos-Timestamp: <unix ms>
//   X-Kairos-Signature: <base64(hmac_sha256(secret, `${ts}.${body}`))>
// Body:
//   { "target": "base44", "secrets": ["linear-api-key", "tavily-api-key", ...] }
// Response:
//   { schemaVersion, expiresAt, secrets: { ... } }

let _cache = null; // { expiresAtMs:number, secrets:object }

function base64FromBytes(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function hmacSha256Base64(keyString, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(keyString),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64FromBytes(new Uint8Array(sig));
}

/**
 * Get secrets from Kairos Secrets Broker
 * 
 * @param {Object} options
 * @param {string} options.target - Target identifier (default: "base44")
 * @param {string[]} options.secrets - List of secret names to fetch (optional, uses config defaults)
 * @param {boolean} options.forceRefresh - Force refresh cache (default: false)
 * @returns {Promise<Object>} Map of secret names to values
 */
export async function getKairosSecrets({
  target = "base44",
  secrets = null, // null = fetch all allowed secrets for target
  forceRefresh = false,
} = {}) {
  const brokerUrl = Deno.env.get("KAIROS_SECRETS_BROKER_URL");
  const bootstrap = Deno.env.get("KAIROS_BOOTSTRAP_SECRET");

  if (!brokerUrl) throw new Error("Missing KAIROS_SECRETS_BROKER_URL");
  if (!bootstrap) throw new Error("Missing KAIROS_BOOTSTRAP_SECRET");

  const now = Date.now();
  
  // Return cached secrets if still valid (with 5s buffer)
  if (!forceRefresh && _cache && _cache.expiresAtMs > now + 5_000) {
    return _cache.secrets;
  }

  // Build request body
  const body = secrets
    ? JSON.stringify({ target, secrets })
    : JSON.stringify({ target }); // Let broker return all allowed secrets

  const ts = String(Date.now());
  const signature = await hmacSha256Base64(bootstrap, `${ts}.${body}`);

  const res = await fetch(`${brokerUrl}/v1/secrets/bundle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Kairos-Timestamp": ts,
      "X-Kairos-Signature": signature,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Kairos broker error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const expiresAtMs = new Date(data.expiresAt).getTime();

  // Update cache
  _cache = { expiresAtMs, secrets: data.secrets || {} };
  return _cache.secrets;
}

/**
 * Get a specific secret value
 * 
 * @param {string} secretName - Secret name (GCP Secret Manager name, e.g., "linear-api-key")
 * @param {Object} options - Same options as getKairosSecrets
 * @returns {Promise<string|null>} Secret value or null if not found
 */
export async function getKairosSecret(secretName, options = {}) {
  const secrets = await getKairosSecrets(options);
  return secrets[secretName] || null;
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearKairosSecretsCache() {
  _cache = null;
}
```

## Usage Examples

### Basic Usage

```javascript
import { getKairosSecrets } from "./kairosSecrets.js";

export async function handler(req) {
  // Fetch all allowed secrets for base44 target
  const secrets = await getKairosSecrets({ target: "base44" });

  // Access secrets using GCP Secret Manager names (kebab-case)
  const linearKey = secrets["linear-api-key"];
  const tavilyKey = secrets["tavily-api-key"];
  const openaiKey = secrets["openai-api-key"];

  // Use the keys...
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

### Fetch Specific Secrets

```javascript
import { getKairosSecrets } from "./kairosSecrets.js";

export async function handler(req) {
  // Fetch only specific secrets
  const secrets = await getKairosSecrets({
    target: "base44",
    secrets: ["linear-api-key", "tavily-api-key"],
  });

  const linearKey = secrets["linear-api-key"];
  // ...
}
```

### Get Single Secret

```javascript
import { getKairosSecret } from "./kairosSecrets.js";

export async function handler(req) {
  // Fetch a single secret
  const linearKey = await getKairosSecret("linear-api-key", {
    target: "base44",
  });

  if (!linearKey) {
    throw new Error("Linear API key not available");
  }

  // Use the key...
}
```

### Force Refresh

```javascript
import { getKairosSecrets, clearKairosSecretsCache } from "./kairosSecrets.js";

export async function handler(req) {
  // Force refresh cache (ignore cached value)
  const secrets = await getKairosSecrets({
    target: "base44",
    forceRefresh: true,
  });

  // Or clear cache explicitly
  clearKairosSecretsCache();
  const freshSecrets = await getKairosSecrets({ target: "base44" });
}
```

## Secret Name Mapping

The broker returns secrets using **GCP Secret Manager names** (kebab-case). Here's the mapping:

| GCP Secret Name | Base44 Access | Description |
|----------------|---------------|-------------|
| `linear-api-key` | `secrets["linear-api-key"]` | Linear API key |
| `tavily-api-key` | `secrets["tavily-api-key"]` | Tavily search API key |
| `chatgpt-api-key` | `secrets["chatgpt-api-key"]` | ChatGPT API key |
| `openai-api-key` | `secrets["openai-api-key"]` | OpenAI API key |

## Base44 Configuration

Store these **2 secrets** in Base44:

1. **KAIROS_SECRETS_BROKER_URL**
   - Value: `https://kairos-secrets-broker-xxx-xx.a.run.app`
   - Get from: Cloud Run service URL after deployment

2. **KAIROS_BOOTSTRAP_SECRET**
   - Value: The bootstrap secret (64 characters)
   - Get from: GCP Secret Manager `kairos-bootstrap-secret` (or output from deploy script)

## Error Handling

```javascript
import { getKairosSecrets } from "./kairosSecrets.js";

export async function handler(req) {
  try {
    const secrets = await getKairosSecrets({ target: "base44" });
    // Use secrets...
  } catch (error) {
    // Handle errors:
    // - Missing KAIROS_SECRETS_BROKER_URL or KAIROS_BOOTSTRAP_SECRET
    // - Network errors (broker unreachable)
    // - Authentication errors (401)
    // - Invalid requests (400)
    // - Server errors (500)
    
    console.error("Failed to fetch secrets:", error.message);
    return new Response(
      JSON.stringify({ error: "Secret fetch failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

## Caching Behavior

- Secrets are cached for **15 minutes** (as defined by `expiresAt` in broker response)
- Cache includes a **5-second buffer** to prevent edge cases
- Cache is shared across all `getKairosSecrets()` calls
- Use `forceRefresh: true` to bypass cache
- Use `clearKairosSecretsCache()` to clear cache explicitly

## Security Best Practices

1. **Never log secrets** - The client never logs secret values
2. **Use HTTPS only** - Cloud Run enforces HTTPS
3. **Cache responsibly** - Don't cache longer than `expiresAt`
4. **Handle errors gracefully** - Don't expose broker errors to clients
5. **Validate secret existence** - Check for `null` before using secrets

## Troubleshooting

### "Missing KAIROS_SECRETS_BROKER_URL"
- Verify the secret is set in Base44
- Check the secret name matches exactly

### "Missing KAIROS_BOOTSTRAP_SECRET"
- Verify the secret is set in Base44
- Ensure it matches the value in GCP Secret Manager

### "Kairos broker error: 401"
- Verify `KAIROS_BOOTSTRAP_SECRET` matches GCP
- Check signature calculation (should match broker specification)

### "Kairos broker error: 400"
- Check timestamp is current (within ±5 minutes)
- Verify request body format matches specification

### Secret not in response
- Check `scripts/kairos.secrets.config.ts` allows secret for `base44` target
- Verify secret exists in GCP Secret Manager
- Check service account has access to the secret

## Next Steps

1. ✅ Deploy Kairos Secrets Broker to Cloud Run
2. ✅ Store `KAIROS_SECRETS_BROKER_URL` and `KAIROS_BOOTSTRAP_SECRET` in Base44
3. ✅ Add `kairosSecrets.js` to your Base44 project
4. ✅ Update your Base44 handlers to use `getKairosSecrets()`
5. ✅ Test with a simple handler first
6. ✅ Monitor Cloud Run logs for any issues

