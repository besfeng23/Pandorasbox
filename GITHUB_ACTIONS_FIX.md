# GitHub Actions Workflow Failure - Analysis & Fix

## 🔴 Failure Analysis

### Most Recent Failure Details

| Field | Value |
|-------|-------|
| **Workflow Name** | Phase Build Sequences |
| **Run ID** | 20853445619 |
| **Timestamp** | 2026-01-09T13:28:51Z (Updated: 2026-01-09T13:29:32Z) |
| **Status** | completed |
| **Conclusion** | failure |
| **Failed Job** | Execute Pandora Phase Build Sequences (Job ID: 59913826075) |
| **Failed Step** | Run Pandora Build Sequences |

### Error Message

```
Error: Metadata string value "projects/***/databases/(default)" contains illegal characters
```

### Stack Trace

```
at validate (/home/runner/work/Pandorasbox/Pandorasbox/node_modules/@grpc/grpc-js/src/metadata.ts:65:15)
at Metadata.set (/home/runner/work/Pandorasbox/Pandorasbox/node_modules/@grpc/grpc-js/src/metadata.ts:107:5)
at Object.buildMetadata (/home/runner/work/Pandorasbox/Pandorasbox/node_modules/google-gax/src/grpc.ts:343:24)
...
at seedPhases (/home/runner/work/Pandorasbox/Pandorasbox/scripts/seed-phases.ts:84:15)
at execute (/home/runner/work/Pandorasbox/Pandorasbox/scripts/seed-phases.ts:235:11)
```

### Root Cause

The error occurs when Firebase Admin SDK tries to use Application Default Credentials (ADC) in GitHub Actions. The database URL format `projects/***/databases/(default)` contains parentheses `(default)` which are illegal characters in gRPC metadata headers.

**Why it fails:**
- GitHub Actions doesn't have a `service-account.json` file
- Falls back to Application Default Credentials
- ADC tries to construct database URL with `(default)` which contains illegal characters
- gRPC metadata validation fails

## ✅ Fix Applied

### Code Changes

1. **Updated `scripts/seed-phases.ts`**:
   - Added support for `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable
   - Priority order: Env var → Local file → ADC (with proper error handling)
   - Better error messages

2. **Updated `.github/workflows/phase-build.yml`**:
   - Added `FIREBASE_SERVICE_ACCOUNT_KEY` to environment variables
   - Will use service account key from GitHub secrets instead of ADC

### Required Action: Add GitHub Secret

**You need to add the Firebase service account key as a GitHub secret:**

1. Go to: https://github.com/besfeng23/Pandorasbox/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `FIREBASE_SERVICE_ACCOUNT_KEY`
4. Value: Paste the entire contents of your `service-account.json` file (as a single-line JSON string)
5. Click **"Add secret"**

**To get the service account key:**
- Option 1: Use your local `service-account.json` file
- Option 2: Generate new key from Firebase Console:
  - Go to: https://console.firebase.google.com/project/seismic-vista-480710-q5/settings/serviceaccounts/adminsdk
  - Click "Generate new private key"
  - Copy the entire JSON content

## 🚀 Automatic Fix Command

After adding the `FIREBASE_SERVICE_ACCOUNT_KEY` secret, the workflow will automatically run on the next push. To manually trigger:

```bash
# The fix is already pushed, just add the secret and trigger:
gh workflow run "Phase Build Sequences.yml"
```

Or push any commit to trigger automatically:
```bash
git commit --allow-empty -m "Trigger workflow after adding FIREBASE_SERVICE_ACCOUNT_KEY secret"
git push origin main
```

## 📋 Additional Failed Runs

All recent failures have the same root cause:
- Run ID: 20853445619 (2026-01-09T13:28:51Z) - Most recent
- Run ID: 20853440724 (2026-01-09T13:28:40Z)
- Run ID: 20852460315 (2026-01-09T12:50:02Z)
- Run ID: 20852127948 (2026-01-09T12:36:47Z)
- Run ID: 20852028907 (2026-01-09T12:32:48Z)

## ✅ Verification

After adding the secret, the next workflow run should:
1. ✅ Successfully initialize Firebase Admin with service account key
2. ✅ Seed all 15 phases to Firestore
3. ✅ Sync build sequences
4. ✅ Deploy to Firebase Firestore
5. ✅ Complete successfully

## 📝 Summary

**Issue**: Firebase Admin initialization fails in GitHub Actions due to illegal characters in database URL when using ADC.

**Solution**: Use Firebase service account key from GitHub secrets instead of ADC.

**Status**: ✅ Code fixed and pushed. ⚠️ **Action required**: Add `FIREBASE_SERVICE_ACCOUNT_KEY` secret to GitHub repository.

