#!/usr/bin/env node

/**
 * Kairos Event Gateway
 * 
 * Cloud Run service that receives events from producers (GitHub, Linear, Firebase, etc.)
 * and forwards them to Base44 ingest endpoint with proper HMAC signature.
 * 
 * Only Cloud Run knows KAIROS_INGEST_SECRET.
 * Producers use IAM authentication (no shared secrets).
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';

const app = express();

// Body parsing (limit to 1MB)
app.use(express.json({ limit: '1mb' }));

const BASE44_INGEST_URL =
  process.env.BASE44_INGEST_URL || 'https://kairostrack.base44.app/functions/ingest';

// Inject via Cloud Run Secret Manager binding
const RAW_SECRET = process.env.KAIROS_INGEST_SECRET;

if (!RAW_SECRET) {
  console.error('❌ Missing KAIROS_INGEST_SECRET (bind from Secret Manager)');
  process.exit(1);
}

// Trim secret aggressively to eliminate all whitespace/newline/BOM issues
// Cloud Run Secret Manager can inject various whitespace characters
const KAIROS_INGEST_SECRET = RAW_SECRET.trim().replace(/^\uFEFF/, ''); // Remove BOM and all whitespace

// Fail fast if secret looks wrong after normalization
if (!KAIROS_INGEST_SECRET || KAIROS_INGEST_SECRET.length < 32) {
  console.error(`❌ KAIROS_INGEST_SECRET invalid length after normalization: ${KAIROS_INGEST_SECRET.length} (expected >= 32)`);
  process.exit(1);
}

/**
 * Sign body with HMAC-SHA256 and return base64 signature
 * Signs the exact UTF-8 string that will be sent
 */
function signBodyRaw(body: string): string {
  return crypto.createHmac('sha256', KAIROS_INGEST_SECRET).update(body, 'utf8').digest('base64');
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

