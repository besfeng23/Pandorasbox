# How to Send Events to Base44 Kairos Dashboard

## Problem
You don't see anything in the Base44 Kairos dashboard because **no events have been sent yet**.

## Solution: Send Events via Intake Script

The gateway is deployed at: `https://kairos-event-gateway-axypi7xsha-as.a.run.app`

### Option 1: Using GoogleAuth Library (Recommended)

The intake script (`scripts/kairos-intake.ts`) uses the `google-auth-library` which will automatically get a token if you're authenticated with gcloud.

**Steps:**

1. **Ensure you're authenticated:**
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

2. **Set the gateway URL and run intake:**
   ```bash
   $env:KAIROS_EVENT_GATEWAY_URL="https://kairos-event-gateway-axypi7xsha-as.a.run.app"
   npm run kairos:intake
   ```

   Or on Linux/Mac:
   ```bash
   export KAIROS_EVENT_GATEWAY_URL=https://kairos-event-gateway-axypi7xsha-as.a.run.app
   npm run kairos:intake
   ```

### Option 2: Using Pre-minted Token

If Option 1 doesn't work, get a token manually:

1. **Get identity token (in Cloud Shell or with gcloud):**
   ```bash
   gcloud auth print-identity-token
   ```

2. **Set environment variables and run:**
   ```bash
   $env:KAIROS_EVENT_GATEWAY_URL="https://kairos-event-gateway-axypi7xsha-as.a.run.app"
   $env:GOOGLE_ID_TOKEN="<paste-token-here>"
   npm run kairos:intake
   ```

### Option 3: Run in Cloud Shell

The easiest way is to run this in Google Cloud Shell where authentication is automatic:

```bash
# Clone repo if needed
git clone <your-repo-url>
cd <repo-name>

# Set gateway URL
export KAIROS_EVENT_GATEWAY_URL=https://kairos-event-gateway-axypi7xsha-as.a.run.app

# Run intake
npm run kairos:intake
```

## What Gets Sent

The intake script reads from:
- `.kairos/intake/pandora-uiux-spec-items.json` - UI/UX spec items
- `.kairos/intake/kairos-audit-issues.json` - Audit issues  
- `.kairos/intake/elite-redesign-items.json` - Elite redesign items

Each item becomes an event that gets sent to Base44.

## Verify Events Reached Base44

1. **Check Base44 Dashboard:**
   - Go to: https://kairostrack.base44.app
   - Look for events with source: `uiux`, `audit`, or `elite`

2. **If events don't appear:**
   - **Secret mismatch:** The `kairos-ingest-secret` in GCP must match Base44's secret exactly
   - **Check Base44 logs:** Look for signature verification errors
   - **Test secret match:** Run `services/kairos-event-gateway/scripts/test-direct-base44.sh` in Cloud Shell

## Troubleshooting

### "Authentication required"
- Run `gcloud auth application-default login`
- Or set `GOOGLE_ID_TOKEN` manually

### "Failed to send event (HTTP 401)"
- Gateway requires IAM authentication
- Ensure you're using a valid identity token
- Check service account has `roles/run.invoker` permission

### "Failed to send event (HTTP 502)"
- Base44 rejected the event (likely secret mismatch)
- Check Base44 logs for "Invalid signature" errors
- Verify secrets match using test script

### Events sent but not in Base44
- **Most common:** Secret mismatch between GCP and Base44
- **Solution:** Update Base44 secret to match GCP secret exactly (no newlines!)

## Quick Test

To verify the gateway is working, you can send a single test event:

```bash
# In Cloud Shell
TOKEN=$(gcloud auth print-identity-token)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dedupeKey": "test:event:'$(date +%s)'",
    "source": "test",
    "action": "test.event",
    "status": "ok"
  }' \
  https://kairos-event-gateway-axypi7xsha-as.a.run.app/v1/event
```

If this succeeds, check Base44 dashboard - you should see a test event appear.

