#!/usr/bin/env node

/**
 * Kairos Secrets Broker
 * 
 * Cloud Run service that provides short-lived secret bundles to trusted external callers.
 * Enforces HMAC signature verification and replay protection.
 */

import express, { Request, Response } from 'express';
import { fetchSecrets } from './secret-manager.js';
import { verifyRequest } from './auth.js';
import { BundleRequest, BundleResponse, ErrorResponse } from './types.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware to capture raw body for signature verification
// Must be before express.json() middleware
app.use('/v1/secrets/bundle', express.raw({ type: 'application/json' }));

app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'kairos-secrets-broker' });
});

// Secrets bundle endpoint
app.post('/v1/secrets/bundle', async (req: Request, res: Response) => {
  try {
    // Get signature and timestamp from headers
    const signature = req.headers['x-kairos-signature'] as string | undefined;
    const timestamp = req.headers['x-kairos-timestamp'] as string | undefined;
    
    // Get raw body (express.raw middleware stores it as Buffer)
    let rawBody: string;
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
      req.body = JSON.parse(rawBody);
    } else {
      rawBody = JSON.stringify(req.body);
    }

    // Verify request authentication
    const verification = verifyRequest(signature, timestamp, rawBody);
    if (!verification.isValid) {
      const errorResponse: ErrorResponse = {
        error: 'Authentication failed',
        code: 'UNAUTHORIZED',
        message: verification.error,
      };
      return res.status(401).json(errorResponse);
    }

    // Validate request body
    const body = req.body as Partial<BundleRequest>;
    if (!body.target || !Array.isArray(body.secrets)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid request',
        code: 'BAD_REQUEST',
        message: 'Request must include "target" (string) and "secrets" (string[])',
      };
      return res.status(400).json(errorResponse);
    }

    if (body.secrets.length === 0) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid request',
        code: 'BAD_REQUEST',
        message: 'Secrets array cannot be empty',
      };
      return res.status(400).json(errorResponse);
    }

    // Fetch secrets (only allowed ones will be returned)
    const secrets = await fetchSecrets(body.target, body.secrets);

    // Calculate expiration (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Build deterministic response (sorted keys)
    const response: BundleResponse = {
      schemaVersion: '1.0.0',
      expiresAt,
      secrets: Object.keys(secrets)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = secrets[key];
          return sorted;
        }, {} as Record<string, string>),
    };

    res.json(response);
  } catch (error: any) {
    // Never log secrets in error messages
    console.error('Error processing request:', error.message);
    const errorResponse: ErrorResponse = {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
    res.status(500).json(errorResponse);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Kairos Secrets Broker listening on port ${PORT}`);
});

