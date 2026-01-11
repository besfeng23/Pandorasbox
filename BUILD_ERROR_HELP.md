# Build Error Troubleshooting

The build is failing. To see the exact error, you can:

## Option 1: View Build Logs in Console

Open this URL in your browser:
```
https://console.cloud.google.com/cloud-build/builds?project=seismic-vista-480710-q5
```

Find the latest failed build and click to see logs.

## Option 2: Use gcloud CLI

```powershell
# Get latest build ID
& "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" builds list --limit=1 --region=asia-southeast1 --format="value(id)"

# View logs (replace BUILD_ID with actual ID)
& "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" builds log BUILD_ID --region=asia-southeast1
```

## Common Issues

### 1. TypeScript Compilation Error

If TypeScript fails:
- Check `tsconfig.json` syntax
- Verify all imports are correct
- Check for missing type definitions

### 2. Missing Dependencies

If npm install fails:
- Check `package.json` syntax
- Verify dependency versions are valid

### 3. Build Script Error

If `npm run build` fails:
- Check TypeScript is in devDependencies
- Verify `tsconfig.json` is valid JSON

### 4. Fetch API Issue (Node.js 18+)

If you see `fetch is not defined`:
- Node.js 20 has global `fetch`, but TypeScript might not recognize it
- This should work out of the box in Node 20

## Quick Test Locally

To test the build locally first:

```powershell
cd services\kairos-event-gateway
npm install
npm run build
```

If this works locally, the issue is with the Docker build. If it fails locally, fix the TypeScript/Node issue first.

