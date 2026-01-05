# Cloud Scheduler Setup for Memory Cleanup

Since you're using Firebase App Hosting (not Cloud Functions), the cleanup job needs to be set up using Google Cloud Scheduler to call a Next.js API route.

## Setup Steps

### 1. Get Your App Hosting URL
Your App Hosting URL should be something like:
```
https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app
```

### 2. Create Cloud Scheduler Job

1. Go to [Google Cloud Console](https://console.cloud.google.com/cloudscheduler)
2. Select your project: `seismic-vista-480710-q5`
3. Click **"Create Job"**

### 3. Configure the Job

- **Name**: `cleanup-old-data`
- **Region**: `asia-southeast1` (or your App Hosting region)
- **Frequency**: `0 2 * * *` (runs daily at 2 AM UTC)
- **Timezone**: `UTC`
- **Target type**: `HTTP`
- **URL**: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/cleanup`
- **HTTP method**: `POST`
- **Headers** (optional, for security):
  - `Authorization`: `Bearer YOUR_SECRET_TOKEN`
  - (Set `CRON_SECRET` in your App Hosting environment variables)

### 4. Authentication (Optional but Recommended)

For security, you can add a secret token:

1. In `apphosting.yaml`, add:
   ```yaml
   - variable: CRON_SECRET
     secret: cron-secret  # Create this in Secret Manager
   ```

2. Uncomment the authorization check in `src/app/api/cron/cleanup/route.ts`

3. Create the secret in Secret Manager:
   ```bash
   gcloud secrets create cron-secret --data-file=- <<< "your-random-secret-token"
   ```

4. Grant App Hosting access:
   ```bash
   firebase apphosting:secrets:grantaccess cron-secret
   ```

### 5. Test the Endpoint

You can test the cleanup endpoint manually:
```bash
curl -X POST https://your-app-url/api/cron/cleanup
```

Or visit it in your browser (GET request also works for testing).

## Alternative: Manual Cleanup

If you don't want to set up Cloud Scheduler, you can also:
1. Create a button in the Settings page to trigger cleanup manually
2. Use a third-party cron service like [cron-job.org](https://cron-job.org) to call the endpoint

## Notes

- The cleanup deletes data older than 90 days
- It processes in batches of 500 documents at a time
- The endpoint is idempotent (safe to call multiple times)

