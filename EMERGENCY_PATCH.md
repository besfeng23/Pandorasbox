# Emergency Patch Command for Cloud Run

Since the deployment used `firebase deploy` (Web Frameworks) instead of App Hosting, your `apphosting.yaml` settings were ignored. You must run this command in **Google Cloud Shell** (or your local terminal if `gcloud` is installed) to fix the CPU throttling and inject secrets.

## The Command

Copy and paste this entire block:

```bash
gcloud run services update ssrseismicvista480710q5 \
  --project=seismic-vista-480710-q5 \
  --region=asia-southeast1 \
  --min-instances=1 \
  --no-cpu-throttling \
  --set-secrets="OPENAI_API_KEY=openai-api-key:latest,\
GEMINI_API_KEY=gemini-api-key:latest,\
ADMIN_CLIENT_EMAIL=firebase-client-email:latest,\
ADMIN_PRIVATE_KEY=firebase-private-key:latest,\
TAVILY_API_KEY=tavily-api-key:latest"
```

### What this does:
1.  **`--min-instances=1`**: Ensures at least one server is always running (prevents cold starts).
2.  **`--no-cpu-throttling`**: Ensures the CPU stays active after the response is sent, allowing your **Async Nervous System** (Memory Lane) to complete.
3.  **`--set-secrets`**: Mounts the secrets you created earlier into the environment variables the app expects (`ADMIN_CLIENT_EMAIL`, etc.).

### Verification
After running this, wait for the new revision to deploy (green checkmark in console), then test the **Audio Memory** feature again.

