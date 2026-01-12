# Troubleshooting: No Data in Base44 Kairos Dashboard

## Problem
Events are not appearing in the Base44 Kairos dashboard at `https://kairostrack.base44.app`.

## Quick Diagnosis Steps

### 1. Check if Gateway is Deployed

```bash
gcloud run services list --region=asia-southeast1 --filter="metadata.name:kairos-event-gateway"
```

Expected: Service should exist with a URL like `https://kairos-event-gateway-xxx.run.app`

### 2. Check Gateway Health

The gateway requires IAM authentication, so health check might fail. Try:

```bash
# Get identity token
TOKEN=$(gcloud auth print-identity-token --audience=https://kairos-event-gateway-xxx.run.app)

# Check health (might still require auth)
curl -H "Authorization: Bearer $TOKEN" https://kairos-event-gateway-xxx.run.app/healthz
```

### 3. Verify Secret Matches

**Critical:** The `kairos-ingest-secret` in GCP Secret Manager must **exactly match** the secret in Base44.

```bash
# Test if secrets match (run in Cloud Shell)
cd services/kairos-event-gateway
./scripts/test-direct-base44.sh
```

If this fails, the secrets don't match and events will be rejected by Base44.

### 4. Send Test Event

```bash
# Set gateway URL
export KAIROS_EVENT_GATEWAY_URL=https://kairos-event-gateway-xxx.run.app

# Get token
export GOOGLE_ID_TOKEN=$(gcloud auth print-identity-token --audience=$KAIROS_EVENT_GATEWAY_URL)

# Send intake events
npm run kairos:intake
```

### 5. Check Base44 Configuration

1. **Verify Base44 Secret:**
   - Go to Base44 dashboard
   - Check Secrets → `KAIROS_INGEST_SECRET`
   - Must match GCP secret exactly (no newlines, no whitespace)

2. **Check Base44 Logs:**
   - Look for signature verification errors
   - Check if events are being received but rejected

3. **Verify Ingest Endpoint:**
   - Should be: `https://kairostrack.base44.app/functions/ingest`
   - Check if endpoint is accessible

## Common Issues

### Issue 1: Secret Mismatch
**Symptom:** Events sent but Base44 returns 400/401 with "Invalid signature"

**Solution:**
1. Get GCP secret: `gcloud secrets versions access latest --secret=kairos-ingest-secret`
2. Update Base44 secret to match exactly (no trailing newlines!)
3. Use `printf '%s'` (not `echo`) when creating/updating secrets

### Issue 2: No Events Sent
**Symptom:** Gateway is healthy but no events in Base44

**Solution:**
1. Check if intake files exist: `.kairos/intake/*.json`
2. Run intake script: `npm run kairos:intake`
3. Verify events are being sent (check script output)

### Issue 3: Gateway Not Deployed
**Symptom:** 404 or service not found

**Solution:**
1. Deploy gateway: See `services/kairos-event-gateway/DEPLOYMENT.md`
2. Or use quick deploy: `DEPLOY_KAIROS_EVENT_GATEWAY.md`

### Issue 4: Authentication Failures
**Symptom:** 401 Unauthorized when sending events

**Solution:**
1. Ensure you have identity token: `gcloud auth print-identity-token`
2. Grant IAM access if using service account
3. Check service account has `roles/run.invoker` permission

## Verification Checklist

- [ ] Gateway service exists and is running
- [ ] `kairos-ingest-secret` exists in GCP Secret Manager
- [ ] Base44 has matching `KAIROS_INGEST_SECRET` (exact match, no newlines)
- [ ] Intake files exist: `.kairos/intake/*.json`
- [ ] Intake script runs successfully: `npm run kairos:intake`
- [ ] Test event reaches Base44 (check Base44 logs)
- [ ] Base44 dashboard shows events

## Next Steps

1. **If gateway not deployed:** Deploy it first
2. **If secret mismatch:** Fix secret in Base44 to match GCP
3. **If no events sent:** Run `npm run kairos:intake`
4. **If events sent but not appearing:** Check Base44 logs and dashboard configuration

## Getting Help

- Check gateway logs: `gcloud run services logs read kairos-event-gateway --region=asia-southeast1`
- Check Base44 logs in dashboard
- Verify secret match using test script
- Review deployment docs: `services/kairos-event-gateway/DEPLOYMENT.md`

