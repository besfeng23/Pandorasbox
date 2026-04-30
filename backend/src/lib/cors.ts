import { NextRequest, NextResponse } from 'next/server';

function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function corsHeaders(request?: NextRequest) {
  const origin = request?.headers.get('origin') ?? '';
  const allowed = allowedOrigins();
  const allowOrigin = origin && allowed.includes(origin) ? origin : '';

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-API-Key, x-cron-secret',
    Vary: 'Origin',
  };

  if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin;
  return headers;
}

export function handleOptions(request?: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders(request) });
}
