# Base44 Integration Quick Start

Get your Base44 API integration up and running in 3 steps.

## Step 1: Get Your Credentials

1. **App ID**: Found in your Base44 API URL (e.g., `6962980527a433f05c114277`)
   - Or check your Base44 dashboard → Settings → App Info
2. **API Key**: Go to Base44 dashboard → Settings → API Keys
   - Copy your API key (or create a new one if needed)

## Step 2: Store Credentials in Google Cloud Secret Manager (Recommended)

The Base44 client automatically fetches credentials from GCP Secret Manager.

### Quick Setup Script

**Windows PowerShell:**
```powershell
.\scripts\setup-base44-gcp-secrets.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/setup-base44-gcp-secrets.sh
./scripts/setup-base44-gcp-secrets.sh
```

This will:
- Create `base44-app-id` secret in GCP Secret Manager
- Create `base44-api-key` secret in GCP Secret Manager
- Prompt you for the values securely

### Manual Setup

Or create secrets manually:

```bash
# Create App ID secret
echo -n "6962980527a433f05c114277" | gcloud secrets create base44-app-id --data-file=-

# Create API Key secret
echo -n "your_api_key_here" | gcloud secrets create base44-api-key --data-file=-
```

### Grant Access

Grant your service account access:

```bash
gcloud secrets add-iam-policy-binding base44-app-id \
  --member="serviceAccount:YOUR_SA@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding base44-api-key \
  --member="serviceAccount:YOUR_SA@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 3: Alternative - Environment Variables (Fallback)

### Option A: Environment Variable (Recommended for Testing)

**Windows PowerShell:**
```powershell
$env:BASE44_APP_ID="6962980527a433f05c114277"
$env:BASE44_API_KEY="your_key_here"
```

**Windows CMD:**
```cmd
set BASE44_APP_ID=6962980527a433f05c114277
set BASE44_API_KEY=your_key_here
```

**Linux/Mac:**
```bash
export BASE44_APP_ID=6962980527a433f05c114277
export BASE44_API_KEY=your_key_here
```

### Option B: .env File (Recommended for Development)

Create or update `.env` in your project root:
```bash
BASE44_API_URL=https://app.base44.com
BASE44_APP_ID=6962980527a433f05c114277
BASE44_API_KEY=your_key_here
```

## Step 3: Test and Run

### Test the Connection
```bash
npm run base44:test
```

### Run a Dry-Run Sync (No Changes)
```bash
npm run base44:sync:dry-run
```

### Run Full Sync
```bash
npm run base44:sync
```

## Automated Setup

Or use the setup script:
```bash
npm run base44:setup
```

This will guide you through the configuration process.

## Troubleshooting

### "Authentication required" Error
- Verify your API key is correct
- Check that `BASE44_API_KEY` is set in your environment
- Ensure the API key has the necessary permissions in Base44

### "404 Not Found" Error
- Verify `BASE44_API_URL` is correct (default: `https://kairostrack.base44.app`)
- Check that the `kairosApi` function is deployed in Base44

### "Base44 client is disabled"
- This happens in test environments
- Set `NODE_ENV` to something other than `test`, or explicitly enable:
  ```typescript
  import { initBase44Client } from './src/lib/base44Client';
  initBase44Client({ enabled: true });
  ```

## What Gets Synced?

The sync process:
1. ✅ Fetches active phase from Base44
2. ✅ Gets phase objective from Kairos
3. ✅ Updates phase objective in Base44
4. ✅ Syncs system status per phase
5. ✅ Maps active bugs to phases
6. ✅ Updates alignment checklist

## Next Steps

- Read the full documentation: [BASE44_SYNC.md](./BASE44_SYNC.md)
- Check the API reference in `src/lib/base44Client.ts`
- See example usage in `scripts/base44-sync.ts`

