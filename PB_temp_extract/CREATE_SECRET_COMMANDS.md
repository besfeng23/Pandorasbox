# 🔑 Create ChatGPT API Key Secret - Exact Commands

Since gcloud is not in your PATH, run these commands from where gcloud is installed, or add gcloud to your PATH first.

## Option 1: If gcloud is installed but not in PATH

Find where gcloud is installed, then run:

```powershell
# Replace with your actual gcloud path
$gcloud = "C:\path\to\gcloud.cmd"

# Set project
& $gcloud config set project seismic-vista-480710-q5

# Create secret
echo "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL" | & $gcloud secrets create chatgpt-api-key --data-file= --replication-policy="automatic"

# Grant access
& $gcloud secrets add-iam-policy-binding chatgpt-api-key `
  --member="serviceAccount:service-536979070288@gcp-sa-apphosting.iam.gserviceaccount.com" `
  --role="roles/secretmanager.secretAccessor"
```

## Option 2: Add gcloud to PATH (Recommended)

1. Find where gcloud is installed (usually in `%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin\`)
2. Add it to PATH:
   ```powershell
   $gcloudPath = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin"
   $env:PATH += ";$gcloudPath"
   ```
3. Then run the commands above

## Option 3: Use Google Cloud Console (Easiest)

**Direct link**: https://console.cloud.google.com/security/secret-manager/create?project=seismic-vista-480710-q5

1. **Name**: `chatgpt-api-key`
2. **Secret value**: `OKepTRWlwBohzaEbCGQgcUZXjI34m7qL`
3. Click **"CREATE SECRET"**
4. **Grant access**:
   - Click on the secret after creation
   - Go to **"PERMISSIONS"** tab
   - Click **"GRANT ACCESS"**
   - Principal: `service-536979070288@gcp-sa-apphosting.iam.gserviceaccount.com`
   - Role: **"Secret Manager Secret Accessor"**
   - Click **"SAVE"**

## Quick Copy-Paste Commands (if gcloud is in PATH)

```powershell
gcloud config set project seismic-vista-480710-q5
echo "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL" | gcloud secrets create chatgpt-api-key --data-file= --replication-policy="automatic"
gcloud secrets add-iam-policy-binding chatgpt-api-key --member="serviceAccount:service-536979070288@gcp-sa-apphosting.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
```

---

**After creating the secret, the build will automatically retry and succeed!** ✅

