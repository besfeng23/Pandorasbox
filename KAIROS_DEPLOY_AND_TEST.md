# 🚀 Kairos Deploy & Test - Quick Guide

## Problem
Kairos stopped working or scripts hang when deploying/sending events.

## Solution: All-in-One Scripts

Two scripts are available:

### 1. Interactive Script (Recommended)
```powershell
.\scripts\deploy-and-test-kairos.ps1
```

**Features:**
- ✅ Checks current deployment state
- ✅ Prompts before redeploying if service exists
- ✅ Deploys gateway if needed
- ✅ Grants IAM access
- ✅ Tests health endpoint
- ✅ Sends test events
- ✅ Uses pre-minted tokens (avoids hanging)

### 2. Auto Script (Non-Interactive)
```powershell
.\scripts\deploy-and-test-kairos-auto.ps1
```

**Features:**
- ✅ Always redeploys (no prompts)
- ✅ Faster execution
- ✅ Good for CI/CD or when you want to force redeploy

## What Was Fixed

### Issue: Scripts Hanging
**Root Cause:** The `GoogleAuth` library's `getIdTokenClient()` can hang if:
- Network issues
- Credentials not properly configured
- Service account permissions missing

**Fix:** ✅ Scripts now **always use pre-minted tokens** via `gcloud auth print-identity-token` instead of relying on the GoogleAuth library. This prevents hanging.

### Issue: No Data in Base44
**Root Cause:** Events not being sent or gateway not deployed.

**Fix:** ✅ Scripts now:
- Deploy gateway if missing
- Grant IAM access automatically
- Send test events automatically
- Use pre-minted tokens to avoid hanging

## Usage

### First Time Setup
```powershell
# 1. Ensure authenticated
gcloud auth login

# 2. Run deploy & test
.\scripts\deploy-and-test-kairos.ps1
```

### Quick Test (Service Already Deployed)
```powershell
# Get gateway URL
$GATEWAY_URL = gcloud run services describe kairos-event-gateway --region=asia-southeast1 --format="value(status.url)"

# Get token and send events
$env:KAIROS_EVENT_GATEWAY_URL = $GATEWAY_URL
$env:GOOGLE_ID_TOKEN = gcloud auth print-identity-token --audience=$GATEWAY_URL
npm run kairos:intake
```

### Force Redeploy
```powershell
.\scripts\deploy-and-test-kairos-auto.ps1
```

## Troubleshooting

### Script Hangs
If the script still hangs:
1. **Check network connectivity**
2. **Verify gcloud auth:**
   ```powershell
   gcloud auth list
   gcloud auth application-default login
   ```
3. **Use manual token:**
   ```powershell
   $token = gcloud auth print-identity-token --audience=<GATEWAY_URL>
   $env:GOOGLE_ID_TOKEN = $token
   $env:KAIROS_EVENT_GATEWAY_URL = <GATEWAY_URL>
   npm run kairos:intake
   ```

### No Events in Base44
1. **Check gateway logs:**
   ```powershell
   gcloud run services logs read kairos-event-gateway --region=asia-southeast1 --limit=50
   ```

2. **Verify secret matches:**
   ```powershell
   cd services\kairos-event-gateway
   .\scripts\test-direct-base44.ps1
   ```

3. **Test gateway directly:**
   ```powershell
   .\scripts\test-kairos-event-gateway.ps1
   ```

### 401/403 Errors
Grant IAM access:
```powershell
$account = gcloud config get-value account
gcloud run services add-iam-policy-binding kairos-event-gateway `
  --region=asia-southeast1 `
  --member="user:$account" `
  --role="roles/run.invoker"
```

## What the Scripts Do

1. **Check Prerequisites**
   - ✅ gcloud CLI installed
   - ✅ Authenticated
   - ✅ Project set
   - ✅ Secret exists

2. **Check Deployment State**
   - ✅ Service exists?
   - ✅ Get service URL

3. **Deploy (if needed)**
   - ✅ Enable APIs
   - ✅ Create service account
   - ✅ Build & push container
   - ✅ Deploy to Cloud Run
   - ✅ Bind secrets

4. **Configure Access**
   - ✅ Grant IAM access
   - ✅ Get identity token

5. **Test**
   - ✅ Health check
   - ✅ Send test events

6. **Send Events**
   - ✅ Use intake script if files exist
   - ✅ Send simple test event otherwise
   - ✅ Always use pre-minted token (no hanging!)

## Next Steps

After running the script:
1. ✅ Check Base44 dashboard: https://kairostrack.base44.app
2. ✅ Verify events appear
3. ✅ Check gateway logs if issues persist

## Related Documentation

- **Troubleshooting**: `WHAT_STOPPED.md`
- **Deployment Guide**: `DEPLOY_KAIROS_EVENT_GATEWAY.md`
- **Sending Events**: `SEND_KAIROS_EVENTS.md`
- **Base44 Issues**: `TROUBLESHOOT_KAIROS_BASE44.md`

