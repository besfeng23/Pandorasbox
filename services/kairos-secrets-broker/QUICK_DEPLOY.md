# Quick Deploy - Kairos Secrets Broker

## One-Command Deployment

From the **repo root**, run:

```powershell
.\services\kairos-secrets-broker\deploy.ps1
```

That's it! The script will:
1. ✅ Enable required GCP APIs
2. ✅ Create service account
3. ✅ Create bootstrap secret (if needed)
4. ✅ Create Artifact Registry repo
5. ✅ Build and push container image
6. ✅ Grant secret access
7. ✅ Deploy to Cloud Run
8. ✅ Test health endpoint

## Prerequisites

- **gcloud CLI** installed and authenticated
  - Download: https://cloud.google.com/sdk/docs/install
  - Authenticate: `gcloud auth login`
- **Project permissions**: Owner or Editor role on `seismic-vista-480710-q5`

## What Gets Created

### GCP Resources
- Service Account: `kairos-secrets-broker-sa@seismic-vista-480710-q5.iam.gserviceaccount.com`
- Artifact Registry: `kairos` repository in `asia-southeast1`
- Cloud Run Service: `kairos-secrets-broker` in `asia-southeast1`
- Bootstrap Secret: `kairos-bootstrap-secret` (if it doesn't exist)

### Secrets Granted Access
- `kairos-bootstrap-secret` (required)
- `linear-api-key`
- `tavily-api-key`
- `chatgpt-api-key`
- `openai-api-key`

## After Deployment

The script will output:
1. **Service URL** - Save this for Base44
2. **Bootstrap Secret** - Save this for Base44 (if newly created)

Store in Base44:
- `KAIROS_BOOTSTRAP_SECRET` = bootstrap secret value
- `KAIROS_SECRETS_BROKER_URL` = service URL

## Troubleshooting

### "gcloud not found"
Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install

### "Permission denied"
Run: `gcloud auth login` and ensure you have Owner/Editor role

### "Service account already exists"
This is normal - the script continues automatically

### "Secret not found"
Some secrets may not exist yet. The script continues and grants access to existing ones.

## Manual Steps (if needed)

If the script fails, see `DEPLOYMENT.md` for step-by-step manual instructions.

