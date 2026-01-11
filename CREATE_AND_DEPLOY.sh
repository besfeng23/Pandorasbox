#!/bin/bash
# Create kairos-event-gateway service files and deploy
# Run this in Cloud Shell from your home directory

set -e

export PROJECT_ID=seismic-vista-480710-q5
export REGION=asia-southeast1

echo "🚀 Creating kairos-event-gateway service..."

# Create directory structure
mkdir -p services/kairos-event-gateway/src
cd services/kairos-event-gateway

# Create package.json
cat > package.json << 'ENDOFFILE'
{
  "name": "kairos-event-gateway",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.10"
  }
}
ENDOFFILE

# Create tsconfig.json
cat > tsconfig.json << 'ENDOFFILE'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
ENDOFFILE

# Create Dockerfile
cat > Dockerfile << 'ENDOFFILE'
FROM node:20-alpine
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "run", "start"]
ENDOFFILE

# Create src/index.ts
cat > src/index.ts << 'ENDOFFILE'
import express, { Request, Response } from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json({ limit: '1mb' }));

const BASE44_INGEST_URL = process.env.BASE44_INGEST_URL || 'https://kairostrack.base44.app/functions/ingest';
const KAIROS_INGEST_SECRET = process.env.KAIROS_INGEST_SECRET;

if (!KAIROS_INGEST_SECRET) {
  console.error('❌ Missing KAIROS_INGEST_SECRET');
  process.exit(1);
}

function signBodyRaw(body: string): string {
  return crypto.createHmac('sha256', KAIROS_INGEST_SECRET!).update(body).digest('base64');
}

function normalizeEvent(payload: any): any {
  const out = { ...payload };
  if (!out.timestamp) out.timestamp = new Date().toISOString();
  if (out.schemaVersion == null) out.schemaVersion = 1;
  return out;
}

app.post('/v1/event', async (req: Request, res: Response) => {
  try {
    const event = normalizeEvent(req.body);
    const body = JSON.stringify(event);
    const signature = signBodyRaw(body);

    const response = await fetch(BASE44_INGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      body,
    });

    const text = await response.text().catch(() => '');
    
    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        upstreamStatus: response.status,
        upstreamBody: text.slice(0, 500),
      });
    }

    return res.json({ ok: true });
  } catch (error: any) {
    console.error('Error:', error.message);
    return res.status(500).json({ ok: false, error: error?.message || 'unknown_error' });
  }
});

app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'kairos-event-gateway' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'kairos-event-gateway' });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`✅ Kairos Event Gateway listening on port ${port}`);
});
ENDOFFILE

echo "✅ Files created!"
cd ../..

# Verify files exist
echo ""
echo "📋 Verifying files..."
ls -la services/kairos-event-gateway/src/index.ts
ls -la services/kairos-event-gateway/package.json
ls -la services/kairos-event-gateway/Dockerfile

echo ""
echo "🚀 Deploying to Cloud Run..."

# Deploy
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

echo ""
echo "✅ Deployment complete!"

# Get service URL
SERVICE_URL=$(gcloud run services describe kairos-event-gateway \
  --region=${REGION} \
  --format="value(status.url)")

echo ""
echo "📍 Service URL: ${SERVICE_URL}"
echo ""
echo "🔍 Test health: curl ${SERVICE_URL}/healthz"

