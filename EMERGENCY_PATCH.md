# Emergency Patch Command for Cloud Run

Since the deployment used `firebase deploy` (Web Frameworks) instead of App Hosting, your `apphosting.yaml` settings were ignored. You must run these commands in **Google Cloud Shell** to fix permissions and then patch the service.

## Step 1: Grant Permission (Run this first)

The Cloud Run service uses the default compute service account, which needs permission to read the secrets.

```bash
gcloud projects add-iam-policy-binding seismic-vista-480710-q5 \
    --member="serviceAccount:536979070288-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Step 2: Apply the Patch

Copy and paste this entire block to update the service with correct memory and secrets:

```bash
gcloud run services update ssrseismicvista480710q5 \
  --project=seismic-vista-480710-q5 \
  --region=asia-southeast1 \
  --memory=1Gi \
  --min-instances=1 \
  --no-cpu-throttling \
  --set-secrets="OPENAI_API_KEY=openai-api-key:latest,\
GEMINI_API_KEY=gemini-api-key:latest,\
ADMIN_CLIENT_EMAIL=firebase-client-email:latest,\
ADMIN_PRIVATE_KEY=firebase-private-key:latest"
```

### Note:
Removed `TAVILY_API_KEY` from the command because it seems the secret was not successfully created earlier. We will proceed without it for now.

### Verification
After running this, wait for the new revision to deploy (green checkmark in console), then test the **Audio Memory** feature again.
