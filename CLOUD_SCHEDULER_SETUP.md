# Cloud Scheduler Setup for Scheduled Tasks

Since you're using Firebase App Hosting (not Cloud Functions), all scheduled tasks are implemented as Next.js API routes that can be called by Google Cloud Scheduler.

## Available Scheduled Tasks

1. **Memory Cleanup** - `/api/cron/cleanup` - Deletes old data (90+ days)
2. **Daily Briefing** - `/api/cron/daily-briefing` - Generates morning briefings for users
3. **Nightly Reflection** - `/api/cron/nightly-reflection` - Analyzes user interactions and creates insight memories
4. **Deep Research** - `/api/cron/deep-research` - Self-study agent that researches low-confidence topics and stores acquired knowledge

## Setup Steps

### 1. Get Your App Hosting URL
Your App Hosting URL should be something like:
```
https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app
```

### 2. Create Cloud Scheduler Jobs

Go to [Google Cloud Console](https://console.cloud.google.com/cloudscheduler)
Select your project: `seismic-vista-480710-q5`

#### Job 1: Memory Cleanup

1. Click **"Create Job"**
2. Configure:
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

#### Job 2: Daily Briefing

1. Click **"Create Job"** again
2. Configure:
   - **Name**: `daily-briefing`
   - **Region**: `asia-southeast1`
   - **Frequency**: `0 8 * * *` (runs daily at 8 AM EST / 1 PM UTC)
   - **Timezone**: `America/New_York`
   - **Target type**: `HTTP`
   - **URL**: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/daily-briefing`
   - **HTTP method**: `POST`
   - **Headers** (optional, for security):
     - `Authorization`: `Bearer YOUR_SECRET_TOKEN`

#### Job 3: Nightly Reflection

1. Click **"Create Job"** again
2. Configure:
   - **Name**: `nightly-reflection`
   - **Region**: `asia-southeast1`
   - **Frequency**: `0 3 * * *` (runs daily at 3 AM UTC)
   - **Timezone**: `UTC`
   - **Target type**: `HTTP`
   - **URL**: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/nightly-reflection`
   - **HTTP method**: `POST`
   - **Headers** (optional, for security):
     - `Authorization`: `Bearer YOUR_SECRET_TOKEN`
   - **Description**: "Nightly reflection agent that analyzes user interactions and creates insight memories for offline learning"

#### Job 4: Deep Research

1. Click **"Create Job"** again
2. Configure:
   - **Name**: `deep-research`
   - **Region**: `asia-southeast1`
   - **Frequency**: `0 */6 * * *` (runs every 6 hours)
   - **Timezone**: `UTC`
   - **Target type**: `HTTP`
   - **URL**: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/deep-research`
   - **HTTP method**: `POST`
   - **Headers** (optional, for security):
     - `Authorization`: `Bearer YOUR_SECRET_TOKEN`
   - **Description**: "Deep research agent that self-studies low-confidence topics and stores acquired knowledge for future answers"

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

### 5. Test the Endpoints

You can test the endpoints manually:

**Memory Cleanup:**
```bash
curl -X POST https://your-app-url/api/cron/cleanup
```

**Daily Briefing:**
```bash
curl -X POST https://your-app-url/api/cron/daily-briefing
```

Or visit them in your browser (GET request also works for testing).

## Alternative: Manual Cleanup

If you don't want to set up Cloud Scheduler, you can also:
1. Create a button in the Settings page to trigger cleanup manually
2. Use a third-party cron service like [cron-job.org](https://cron-job.org) to call the endpoint

## Notes

- The cleanup deletes data older than 90 days
- It processes in batches of 500 documents at a time
- The endpoint is idempotent (safe to call multiple times)

