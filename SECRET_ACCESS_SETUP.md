# Secret Access Setup - IAM Permissions

This document describes the IAM permissions required for secrets to work in Firebase App Hosting.

## Required Service Accounts

The following service accounts need `roles/secretmanager.secretAccessor` permission:

1. **Cloud Build Service Account**: `536979070288@cloudbuild.gserviceaccount.com`
   - Required during the build process to access secrets

2. **Firebase App Hosting Compute Service Account**: `firebase-app-hosting-compute@seismic-vista-480710-q5.iam.gserviceaccount.com`
   - Required at runtime to inject secrets into the application

## Grant Access Commands

Run these commands using gcloud CLI to grant access to secrets:

```bash
# Set project
gcloud config set project seismic-vista-480710-q5

# Grant access to Cloud Build service account
gcloud secrets add-iam-policy-binding chatgpt-api-key \
  --member="serviceAccount:536979070288@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to App Hosting compute service account
gcloud secrets add-iam-policy-binding chatgpt-api-key \
  --member="serviceAccount:firebase-app-hosting-compute@seismic-vista-480710-q5.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Verify permissions
gcloud secrets get-iam-policy chatgpt-api-key
```

## PowerShell Commands (Windows)

```powershell
$gcloud = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

# Grant access to Cloud Build
& $gcloud secrets add-iam-policy-binding chatgpt-api-key `
  --member="serviceAccount:536979070288@cloudbuild.gserviceaccount.com" `
  --role="roles/secretmanager.secretAccessor"

# Grant access to App Hosting
& $gcloud secrets add-iam-policy-binding chatgpt-api-key `
  --member="serviceAccount:firebase-app-hosting-compute@seismic-vista-480710-q5.iam.gserviceaccount.com" `
  --role="roles/secretmanager.secretAccessor"
```

## Secrets Configured

- `chatgpt-api-key` - For ChatGPT API authentication
- `openai-api-key` - For OpenAI API calls
- `gemini-api-key` - For Google Gemini API calls
- `cron-secret` - For securing cron/API routes

All these secrets need the same IAM permissions granted to both service accounts.

## Status

✅ **Completed** - All permissions granted on Jan 5, 2026

### Secrets Configured:
- ✅ `chatgpt-api-key` - Cloud Build + App Hosting access
- ✅ `openai-api-key` - Cloud Build + App Hosting access  
- ✅ `gemini-api-key` - Cloud Build + App Hosting access
- ✅ `cron-secret` - Created and granted Cloud Build + App Hosting access

All secrets now have the required IAM permissions. The build should succeed.

