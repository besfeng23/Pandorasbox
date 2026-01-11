# Check Build Logs - kairos-event-gateway

## View Build Logs

The build failed. Check the logs at the URL provided in the error:

```
https://console.cloud.google.com/cloud-build/builds;region=asia-southeast1/d8bd04f7-f05e-4bb8-bc86-c5fdaa85c26d?project=536979070288
```

Or check via gcloud:

```bash
gcloud builds log d8bd04f7-f05e-4bb8-bc86-c5fdaa85c26d --region=asia-southeast1
```

## Common Issues

### 1. TypeScript Compilation Errors

If you see TypeScript errors, check:
- Missing type definitions
- Syntax errors in `src/index.ts`
- tsconfig.json issues

### 2. Missing Dependencies

If npm install fails:
- Check package.json syntax
- Verify all dependencies are available

### 3. Build Script Issues

If `npm run build` fails:
- Check tsconfig.json
- Verify TypeScript is in devDependencies

## Quick Fix: Updated Dockerfile

I've updated the Dockerfile to use `node:20-slim` (instead of `node:20-alpine`) which matches the working secrets-broker setup. Try deploying again after updating the Dockerfile.

## Retry Deployment

After checking logs and fixing issues, retry:

```bash
export PROJECT_ID=seismic-vista-480710-q5
export REGION=asia-southeast1

gcloud run deploy kairos-event-gateway \
  --source=services/kairos-event-gateway \
  --region=${REGION} \
  --no-allow-unauthenticated \
  --set-env-vars=BASE44_INGEST_URL=https://kairostrack.base44.app/functions/ingest \
  --set-secrets=KAIROS_INGEST_SECRET=kairos-ingest-secret:latest \
  --service-account=kairos-event-gateway-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=30s
```

