import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { parseBearerTokenFromHeader, requireCron } from '@/server/api-auth';
import { corsHeaders } from '@/lib/cors';

function req(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers });
}

describe('API hardening helpers', () => {
  it('parses bearer token', () => {
    expect(parseBearerTokenFromHeader('Bearer abc')).toBe('abc');
    expect(parseBearerTokenFromHeader('basic abc')).toBeNull();
  });

  it('rejects incorrect cron secret and no bypass token', () => {
    process.env.CRON_SECRET = 'secret1';
    expect(() => requireCron(req('http://localhost/api/cron/janitor', { 'x-cron-secret': 'wrong' }))).toThrow('UNAUTHORIZED');
    expect(() => requireCron(req('http://localhost/api/cron/janitor?secret=antigravity-manual-run-2026'))).toThrow();
  });

  it('cors only allows allowlisted origins', () => {
    process.env.ALLOWED_ORIGINS = 'https://app.example.com,http://localhost:3000';
    const allowed = corsHeaders(req('http://localhost', { origin: 'https://app.example.com' }));
    const blocked = corsHeaders(req('http://localhost', { origin: 'https://evil.com' }));
    expect(allowed['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    expect(blocked['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
