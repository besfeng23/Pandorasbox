# Quick Setup: Base44 Secrets in GCP

Since you've already tested the API connection, you have the credentials. Here's how to set them up in GCP Secret Manager:

## One-Liner (Easiest)

Replace `YOUR_APP_ID` and `YOUR_API_KEY` with your actual credentials:

```powershell
$env:BASE44_APP_ID="YOUR_APP_ID"; $env:BASE44_API_KEY="YOUR_API_KEY"; .\scripts\setup-base44-secrets-auto.ps1
```

## Or Pass Directly

```powershell
.\scripts\setup-base44-secrets-auto.ps1 -AppId "YOUR_APP_ID" -ApiKey "YOUR_API_KEY"
```

## What It Does

1. ✅ Creates `base44-app-id` secret in GCP Secret Manager
2. ✅ Creates `base44-api-key` secret in GCP Secret Manager
3. ✅ Updates existing secrets if they already exist

## After Setup

Once secrets are created, you can:

1. **Test locally** - The sync script will automatically use GCP secrets:
   ```powershell
   npx tsx scripts/base44-sync.ts --verbose
   ```

2. **Grant access to Cloud Run services** (if needed):
   ```powershell
   gcloud secrets add-iam-policy-binding base44-app-id --member="serviceAccount:YOUR_SA@seismic-vista-480710-q5.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
   gcloud secrets add-iam-policy-binding base44-api-key --member="serviceAccount:YOUR_SA@seismic-vista-480710-q5.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
   ```

## Finding Your Credentials

If you need to find your credentials again:

1. **App ID**: Check your Base44 dashboard → Settings → App Info
   - Or look in your Base44 API URL: `https://kairostrack.base44.app/api/apps/{APP_ID}/...`

2. **API Key**: Base44 dashboard → Settings → API Keys
   - Copy your existing API key or create a new one

