#!/bin/bash
# Quick setup script for Cloud Shell
# Creates the service files directly in Cloud Shell

set -e

echo "📦 Creating kairos-event-gateway service structure..."

mkdir -p services/kairos-event-gateway/src
cd services/kairos-event-gateway

# Create package.json
cat > package.json << 'EOF'
{
  "name": "kairos-event-gateway",
  "version": "1.0.0",
  "description": "Kairos Event Gateway - Cloud Run service that signs and forwards events to Base44 ingest",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "engines": {
    "node": ">=20.0.0"
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
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
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
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "run", "start"]
EOF

# Create src/index.ts
cat > src/index.ts << 'EOF'
#!/usr/bin/env node

/**
 * Kairos Event Gateway
 * 
 * Cloud Run service that receives events from producers (GitHub, Linear, Firebase, etc.)
 * and forwards them to Base44 ingest endpoint with proper HMAC signature.
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';

const app = express();

// Body parsing (limit to 1MB)
app.use(express.json({ limit: '1mb' }));

const BASE44_INGEST_URL =
  process.env.BASE44_INGEST_URL || 'https://kairostrack.base44.app/functions/ingest';

// Inject via Cloud Run Secret Manager binding
const KAIROS_INGEST_SECRET = process.env.KAIROS_INGEST_SECRET;

if (!KAIROS_INGEST_SECRET) {
  console.error('❌ Missing KAIROS_INGEST_SECRET (bind from Secret Manager)');
  process.exit(1);
}

/**
 * Sign body with HMAC-SHA256 and return base64 signature
 */
function signBodyRaw(body: string): string {
  return crypto.createHmac('sha256', KAIROS_INGEST_SECRET!).update(body).digest('base64');
}

/**
 * Normalize event payload:
 * - Add timestamp if missing
 * - Add schemaVersion if missing (default: 1)
 */
function normalizeEvent(payload: any): any {
  const out = { ...payload };
  
  // Add timestamp if missing
  if (!out.timestamp) {
    out.timestamp = new Date().toISOString();
  }
  
  // Add schemaVersion if missing
  if (out.schemaVersion == null) {
    out.schemaVersion = 1;
  }
  
  return out;
}

/**
 * POST /v1/event
 * 
 * Receives event from producer, signs it, and forwards to Base44 ingest.
 */
app.post('/v1/event', async (req: Request, res: Response) => {
  try {
    const event = normalizeEvent(req.body);

    // IMPORTANT: signature must match EXACT raw string we send
    const body = JSON.stringify(event);
    const signature = signBodyRaw(body);

    // Forward to Base44 ingest with signature
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
    console.error('Error processing event:', error.message);
    return res.status(500).json({
      ok: false,
      error: error?.message || 'unknown_error',
    });
  }
});

/**
 * GET /healthz
 * 
 * Health check endpoint
 */
app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'kairos-event-gateway' });
});

/**
 * GET /health
 * 
 * Alias for healthz (some systems expect /health)
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'kairos-event-gateway' });
});

// Start server
const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`✅ Kairos Event Gateway listening on port ${port}`);
  console.log(`📍 Base44 Ingest URL: ${BASE44_INGEST_URL}`);
});
EOF

echo "✅ Service files created!"
echo ""
echo "📍 Location: $(pwd)"
echo ""
echo "📋 Next step: Deploy from repo root"
echo "   cd ../.."
echo "   gcloud run deploy kairos-event-gateway --source=services/kairos-event-gateway --region=asia-southeast1 --no-allow-unauthenticated --set-env-vars=BASE44_INGEST_URL=https://kairostrack.base44.app/functions/ingest --set-secrets=KAIROS_INGEST_SECRET=kairos-ingest-secret:latest --service-account=kairos-event-gateway-sa@seismic-vista-480710-q5.iam.gserviceaccount.com --min-instances=0 --max-instances=10 --memory=512Mi --cpu=1 --timeout=30s"

