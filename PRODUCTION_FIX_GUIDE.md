# 🔧 PANDORA'S BOX - PRODUCTION FIX GUIDE
## Generated: 2026-02-01

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### Issue 1: Missing GROQ API Key (Causes 401 Error)
The `groq-api-key` secret does not exist in Google Secret Manager.

**Impact**: The "Builder Agent" (Groq-powered code generation) fails with 401 Unauthorized.

### Issue 2: Wrong Inference URL (Causes 503 Error)  
The configuration points to `10.128.0.4` but the Ollama VM is at `10.128.0.8`.

**Impact**: Health check fails, inference requests timeout.

---

## ✅ FIXES APPLIED (Code Changes)

The following files have been updated:

| File | Change |
|------|--------|
| `backend/apphosting.yaml` | `UNIVERSE_INFERENCE_URL` → `http://10.128.0.8:11434` |
| `apphosting.yaml` | `INFERENCE_URL` → `http://10.128.0.8:11434/v1` |
| `backend/src/app/api/health/inference/route.ts` | Added detailed diagnostics |
| `backend/src/app/api/health/memory/route.ts` | Added detailed diagnostics |

---

## 🚀 DEPLOYMENT COMMANDS

### Step 1: Create the GROQ API Key Secret

```powershell
# Get your Groq API key from https://console.groq.com/keys
# Then run:

$GROQ_KEY = "gsk_YOUR_GROQ_API_KEY_HERE"
Write-Output $GROQ_KEY | gcloud secrets create groq-api-key --data-file=- --project=seismic-vista-480710-q5
```

Or using gcloud CLI directly:
```bash
echo "gsk_YOUR_GROQ_API_KEY_HERE" | gcloud secrets create groq-api-key --data-file=- --project=seismic-vista-480710-q5
```

### Step 2: Grant Cloud Run Access to the Secret

```powershell
gcloud secrets add-iam-policy-binding groq-api-key `
    --member="serviceAccount:536979070288-compute@developer.gserviceaccount.com" `
    --role="roles/secretmanager.secretAccessor" `
    --project=seismic-vista-480710-q5
```

### Step 3: Commit and Push Changes

```powershell
cd C:\Users\Administrator\Desktop\BOX
git add .
git commit -m "fix: Update Ollama IP to 10.128.0.8, add GROQ secret, improve health checks"
git push origin production
```

### Step 4: Verify Deployment

Wait 2-3 minutes for Firebase App Hosting to rebuild, then:

```powershell
# Test Inference Health
Invoke-RestMethod -Uri "https://studio--seismic-vista-480710-q5.us-central1.hosted.app/api/health/inference" | ConvertTo-Json

# Test Memory Health  
Invoke-RestMethod -Uri "https://studio--seismic-vista-480710-q5.us-central1.hosted.app/api/health/memory" | ConvertTo-Json
```

---

## 📊 CURRENT INFRASTRUCTURE STATUS

| Component | IP Address | Port | Status |
|-----------|------------|------|--------|
| Ollama (pandora-inference) | `10.128.0.8` | 11434 | ✅ RUNNING |
| Qdrant (pandora-qdrant) | `10.128.0.3` | 6333 | ✅ RUNNING |
| VPC Connector | `10.9.0.0/28` | - | ✅ READY |

---

## 🔐 SECRETS CHECKLIST

| Secret Name | Status |
|-------------|--------|
| `firebase-service-account-key` | ✅ Exists |
| `firebase-client-email` | ✅ Exists |
| `firebase-private-key` | ✅ Exists |
| `cron-secret` | ✅ Exists |
| `tavily-api-key` | ✅ Exists |
| `groq-api-key` | ❌ MISSING - Create in Step 1 |

---

## 🧪 TROUBLESHOOTING

### If you still see 503 errors after deployment:

1. **Check Ollama is responding**:
   ```powershell
   # SSH into the VM and test locally
   gcloud compute ssh pandora-inference --zone=us-central1-f --project=seismic-vista-480710-q5 -- "curl http://localhost:11434/api/tags"
   ```

2. **Check firewall rules**:
   ```powershell
   gcloud compute firewall-rules list --project=seismic-vista-480710-q5 --filter="name~pandora OR name~allow-internal"
   ```

3. **Restart Ollama container on the VM**:
   ```powershell
   gcloud compute ssh pandora-inference --zone=us-central1-f --project=seismic-vista-480710-q5 -- "sudo docker restart ollama"
   ```

### If you see 401 errors after creating the secret:

1. **Verify secret exists and has a version**:
   ```powershell
   gcloud secrets versions list groq-api-key --project=seismic-vista-480710-q5
   ```

2. **Force a new deployment**:
   ```powershell
   git commit --allow-empty -m "trigger: force redeploy"
   git push origin production
   ```

---

## 📝 NOTES

- The IP change from `10.128.0.4` to `10.128.0.8` likely happened because the VM was recreated or moved.
- Consider reserving a static internal IP for the Ollama VM to prevent this in the future:
  ```powershell
  gcloud compute addresses create ollama-internal-ip --region=us-central1 --subnet=default --addresses=10.128.0.8 --project=seismic-vista-480710-q5
  ```

---

*Last updated: 2026-02-01*
