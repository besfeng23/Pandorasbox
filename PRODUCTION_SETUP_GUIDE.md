# 🚀 Production Setup Guide - Pandora's Box

**Project:** seismic-vista-480710-q5  
**Status:** Code pushed to GitHub ✅  
**Deployment:** Auto-deploying from GitHub ✅

---

## ✅ Completed Steps

1. **Code Pushed to GitHub** ✅
   - All Phase 6 code committed and pushed
   - Repository: https://github.com/besfeng23/Pandorasbox
   - Branch: `main`

2. **Firebase App Hosting** ✅
   - Backends linked to GitHub (auto-deploying)
   - 3 backends configured:
     - `studio` (us-central1)
     - `studio-sg` (asia-southeast1)  
     - `memory-palace` (asia-east1)

---

## ⏳ Remaining Setup Steps

### Step 1: Create Secrets in Cloud Secret Manager

**Required Secrets:**
1. `openai-api-key` - Your OpenAI API key
2. `gemini-api-key` - Your Google Gemini API key
3. `chatgpt-api-key` - Already have: `OKepTRWlwBohzaEbCGQgcUZXjI34m7qL`
4. `cron-secret` - For securing cron endpoints: `pandoras-box-cron-secret-2026`

**Option A: Via Google Cloud Console (Easiest)**
1. Go to: https://console.cloud.google.com/security/secret-manager/create?project=seismic-vista-480710-q5
2. Create each secret with the values above
3. Grant access to service account: `service-536979070288@gcp-sa-apphosting.iam.gserviceaccount.com`
   - Role: `Secret Manager Secret Accessor`

**Option B: Via gcloud CLI**
```bash
# Set project
gcloud config set project seismic-vista-480710-q5

# Create secrets
echo "YOUR_OPENAI_KEY" | gcloud secrets create openai-api-key --data-file=- --replication-policy=automatic
echo "YOUR_GEMINI_KEY" | gcloud secrets create gemini-api-key --data-file=- --replication-policy=automatic
echo "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL" | gcloud secrets create chatgpt-api-key --data-file=- --replication-policy=automatic
echo "pandoras-box-cron-secret-2026" | gcloud secrets create cron-secret --data-file=- --replication-policy=automatic

# Grant access to App Hosting service account
gcloud secrets add-iam-policy-binding openai-api-key --member="serviceAccount:service-536979070288@gcp-sa-apphosting.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding gemini-api-key --member="serviceAccount:service-536979070288@gcp-sa-apphosting.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding chatgpt-api-key --member="serviceAccount:service-536979070288@gcp-sa-apphosting.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding cron-secret --member="serviceAccount:service-536979070288@gcp-sa-apphosting.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
```

---

### Step 2: Set Up Cloud Scheduler Jobs

**Required Jobs:**
1. `cleanup-old-data` - Daily at 2 AM UTC
2. `daily-briefing` - Daily at 1 PM UTC (8 AM EST)
3. `nightly-reflection` - Daily at 3 AM UTC
4. `deep-research` - Every 6 hours
5. `reindex-memories` - Weekly on Sundays at 4 AM UTC
6. `meta-learning` - Daily at 5 AM UTC (Phase 6)

**App URL:** `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app`  
**Location:** `asia-southeast1`

**Option A: Via Google Cloud Console**
1. Go to: https://console.cloud.google.com/cloudscheduler?project=seismic-vista-480710-q5
2. Click "Create Job"
3. Configure each job:

**Job 1: cleanup-old-data**
- Name: `cleanup-old-data`
- Region: `asia-southeast1`
- Frequency: `0 2 * * *` (Daily at 2 AM UTC)
- Target: HTTP
- URL: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/cleanup`
- HTTP method: `POST`
- Description: `Daily cleanup of old threads, memories, and history`

**Job 2: daily-briefing**
- Name: `daily-briefing`
- Region: `asia-southeast1`
- Frequency: `0 13 * * *` (Daily at 1 PM UTC / 8 AM EST)
- Target: HTTP
- URL: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/daily-briefing`
- HTTP method: `POST`

**Job 3: nightly-reflection**
- Name: `nightly-reflection`
- Region: `asia-southeast1`
- Frequency: `0 3 * * *` (Daily at 3 AM UTC)
- Target: HTTP
- URL: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/nightly-reflection`
- HTTP method: `POST`

**Job 4: deep-research**
- Name: `deep-research`
- Region: `asia-southeast1`
- Frequency: `0 */6 * * *` (Every 6 hours)
- Target: HTTP
- URL: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/deep-research`
- HTTP method: `POST`

**Job 5: reindex-memories**
- Name: `reindex-memories`
- Region: `asia-southeast1`
- Frequency: `0 4 * * 0` (Sundays at 4 AM UTC)
- Target: HTTP
- URL: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/reindex-memories`
- HTTP method: `POST`

**Job 6: meta-learning** (Phase 6)
- Name: `meta-learning`
- Region: `asia-southeast1`
- Frequency: `0 5 * * *` (Daily at 5 AM UTC)
- Target: HTTP
- URL: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/meta-learning`
- HTTP method: `POST`

**Option B: Via gcloud CLI**
```bash
# Enable Cloud Scheduler API
gcloud services enable cloudscheduler.googleapis.com --project=seismic-vista-480710-q5

# Create jobs
gcloud scheduler jobs create http cleanup-old-data \
  --location=asia-southeast1 \
  --schedule="0 2 * * *" \
  --time-zone="UTC" \
  --uri="https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/cleanup" \
  --http-method=POST \
  --description="Daily cleanup" \
  --project=seismic-vista-480710-q5

gcloud scheduler jobs create http daily-briefing \
  --location=asia-southeast1 \
  --schedule="0 13 * * *" \
  --time-zone="UTC" \
  --uri="https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/daily-briefing" \
  --http-method=POST \
  --project=seismic-vista-480710-q5

gcloud scheduler jobs create http nightly-reflection \
  --location=asia-southeast1 \
  --schedule="0 3 * * *" \
  --time-zone="UTC" \
  --uri="https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/nightly-reflection" \
  --http-method=POST \
  --project=seismic-vista-480710-q5

gcloud scheduler jobs create http deep-research \
  --location=asia-southeast1 \
  --schedule="0 */6 * * *" \
  --time-zone="UTC" \
  --uri="https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/deep-research" \
  --http-method=POST \
  --project=seismic-vista-480710-q5

gcloud scheduler jobs create http reindex-memories \
  --location=asia-southeast1 \
  --schedule="0 4 * * 0" \
  --time-zone="UTC" \
  --uri="https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/reindex-memories" \
  --http-method=POST \
  --project=seismic-vista-480710-q5

gcloud scheduler jobs create http meta-learning \
  --location=asia-southeast1 \
  --schedule="0 5 * * *" \
  --time-zone="UTC" \
  --uri="https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/meta-learning" \
  --http-method=POST \
  --description="Phase 6: Daily meta-learning" \
  --project=seismic-vista-480710-q5
```

---

## ✅ Verification Steps

1. **Check Deployment Status**
   - Firebase Console: https://console.firebase.google.com/project/seismic-vista-480710-q5/apphosting
   - Verify all 3 backends are deploying successfully

2. **Verify Secrets**
   - Secret Manager: https://console.cloud.google.com/security/secret-manager?project=seismic-vista-480710-q5
   - Ensure all 4 secrets exist and are accessible

3. **Verify Scheduler Jobs**
   - Cloud Scheduler: https://console.cloud.google.com/cloudscheduler?project=seismic-vista-480710-q5
   - Ensure all 6 jobs are created and enabled

4. **Test Endpoints**
   ```bash
   # Test MCP OpenAPI
   curl https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/mcp/openapi
   
   # Test a cron endpoint (with CRON_SECRET header)
   curl -X POST https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/cron/cleanup \
     -H "X-Cron-Secret: pandoras-box-cron-secret-2026"
   ```

---

## 📊 Summary

**What's Done:**
- ✅ Code pushed to GitHub
- ✅ Firebase App Hosting configured
- ✅ Auto-deployment enabled

**What's Needed:**
- ⏳ Create 4 secrets in Cloud Secret Manager
- ⏳ Create 6 Cloud Scheduler jobs
- ⏳ Verify deployment status

**Estimated Time:** 15-20 minutes via Console, 5 minutes via CLI

---

**Quick Links:**
- Firebase Console: https://console.firebase.google.com/project/seismic-vista-480710-q5
- Secret Manager: https://console.cloud.google.com/security/secret-manager?project=seismic-vista-480710-q5
- Cloud Scheduler: https://console.cloud.google.com/cloudscheduler?project=seismic-vista-480710-q5
- GitHub Repo: https://github.com/besfeng23/Pandorasbox

