# Base44 Integration Quick Start

Get your Base44 API integration up and running in 3 steps.

## Step 1: Get Your API Key

1. Go to your Base44 dashboard
2. Navigate to Settings → API Keys
3. Copy your API key (or create a new one if needed)

## Step 2: Set the API Key

### Option A: Environment Variable (Recommended for Testing)

**Windows PowerShell:**
```powershell
$env:BASE44_API_KEY="your_key_here"
```

**Windows CMD:**
```cmd
set BASE44_API_KEY=your_key_here
```

**Linux/Mac:**
```bash
export BASE44_API_KEY=your_key_here
```

### Option B: .env File (Recommended for Development)

Create or update `.env` in your project root:
```bash
BASE44_API_URL=https://kairostrack.base44.app
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

