# What Stopped? - Kairos Event Gateway Troubleshooting

## Quick Diagnosis

Run this to check what stopped:

```powershell
.\scripts\diagnose-kairos-gateway.ps1
```

Or run the quick fix:

```powershell
.\scripts\quick-fix-kairos.ps1
```

## Common Reasons Scripts Stop

### 1. **Authentication Token Generation Hangs**

**Symptom:** Script stops after "Getting authentication token..." or hangs indefinitely.

**Cause:** The `GoogleAuth` library's `getIdTokenClient()` might hang if:
- Network issues
- Credentials not properly configured
- Service account permissions missing

**Fix:**
```powershell
# Use pre-minted token instead
$token = gcloud auth print-identity-token --audience=https://kairos-event-gateway-axypi7xsha-as.a.run.app
$env:GOOGLE_ID_TOKEN = $token
$env:KAIROS_EVENT_GATEWAY_URL = "https://kairos-event-gateway-axypi7xsha-as.a.run.app"
npm run kairos:intake
```

### 2. **Network Timeout**

**Symptom:** Script stops when sending events, no error message.

**Cause:** Gateway or Base44 endpoint is slow or unreachable.

**Fix:**
- Check gateway health: `.\scripts\test-kairos-event-gateway.ps1`
- Check network connectivity
- Increase timeout in script (if needed)

### 3. **Silent Failure in Token Generation**

**Symptom:** Script appears to run but no events sent, no error.

**Cause:** The `getAccessToken()` method was used instead of `getIdToken()`.

**Fix:** ✅ **FIXED** - Updated `scripts/kairos-intake.ts` to use `getIdToken()` correctly.

### 4. **Missing Intake Files**

**Symptom:** Script exits immediately with "No intake files found".

**Fix:**
- Ensure `.kairos/intake/` directory exists
- Add JSON files:
  - `pandora-uiux-spec-items.json`
  - `kairos-audit-issues.json`
  - `elite-redesign-items.json`

### 5. **IAM Permission Issues**

**Symptom:** Script stops with 401/403 errors.

**Fix:**
```powershell
gcloud run services add-iam-policy-binding kairos-event-gateway `
  --region=asia-southeast1 `
  --member="user:$(gcloud config get-value account)" `
  --role="roles/run.invoker"
```

### 6. **Script Encoding Issues (PowerShell)**

**Symptom:** Script stops with encoding errors or unexpected characters.

**Fix:**
- Ensure scripts are saved with UTF-8 encoding
- Run in PowerShell (not CMD)
- Use: `powershell -ExecutionPolicy Bypass -File .\scripts\send-kairos-events.ps1`

## Step-by-Step Recovery

1. **Run diagnostics:**
   ```powershell
   .\scripts\diagnose-kairos-gateway.ps1
   ```

2. **If issues found, run quick fix:**
   ```powershell
   .\scripts\quick-fix-kairos.ps1
   ```

3. **Get fresh token and send events:**
   ```powershell
   $GATEWAY_URL = "https://kairos-event-gateway-axypi7xsha-as.a.run.app"
   $token = gcloud auth print-identity-token --audience=$GATEWAY_URL
   $env:GOOGLE_ID_TOKEN = $token
   $env:KAIROS_EVENT_GATEWAY_URL = $GATEWAY_URL
   npm run kairos:intake
   ```

4. **Or use the PowerShell script:**
   ```powershell
   .\scripts\send-kairos-events.ps1
   ```

## What Was Fixed

✅ **Fixed authentication token method** in `scripts/kairos-intake.ts`:
- Changed from `client.getAccessToken()` to `client.getIdToken()`
- This was likely causing the script to hang or fail silently

✅ **Added progress indicators** to show which event is being sent

✅ **Added small delays** between events to avoid overwhelming the gateway

## Still Having Issues?

1. Check gateway logs:
   ```powershell
   gcloud run services logs read kairos-event-gateway --region=asia-southeast1 --limit=50
   ```

2. Test gateway directly:
   ```powershell
   .\scripts\test-kairos-event-gateway.ps1
   ```

3. Verify Base44 secret matches:
   ```powershell
   cd services\kairos-event-gateway
   .\scripts\test-direct-base44.ps1
   ```

