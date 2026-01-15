#!/usr/bin/env tsx
/**
 * Smoke test for Pandora MCP (Cloud Run / local).
 * - GET /health
 * - POST /mcp { action: "ping" }
 */

import { v4 as uuidv4 } from 'uuid';

async function main() {
  const baseUrl = (process.env.MCP_SMOKE_URL || 'http://localhost:8080').replace(/\/+$/, '');
  const traceId = uuidv4();

  const health = await fetch(`${baseUrl}/health`);
  if (!health.ok) {
    throw new Error(`health failed: HTTP ${health.status}`);
  }

  const pingRes = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ping',
      input: {},
      context: { source: 'smoke' },
      meta: { traceId, client: 'mcp-smoke', timestamp: Date.now() },
    }),
  });

  const body = await pingRes.json().catch(() => null);
  if (!pingRes.ok) {
    throw new Error(`ping failed: HTTP ${pingRes.status} ${JSON.stringify(body)}`);
  }

  process.stdout.write(`ok\ntraceId=${body?.traceId || traceId}\n`);
}

main().catch((err) => {
  console.error('mcp:smoke failed');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});



