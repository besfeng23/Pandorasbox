import { NextRequest, NextResponse } from 'next/server';

const LOCALHOST_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:9002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:9002',
]);

function getAllowedOrigins(): string[] {
  const configured = process.env.CORS_ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
  const appUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  return [...new Set([...configured, ...(appUrl ? [appUrl] : [])])];
}

function resolveOrigin(request?: NextRequest): string {
  const origin = request?.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  const isProduction = process.env.NODE_ENV === 'production';

  if (!origin) {
    return allowedOrigins[0] || process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:9002';
  }

  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  if (!isProduction && LOCALHOST_ORIGINS.has(origin)) {
    return origin;
  }

  return allowedOrigins[0] || 'null';
}

export function corsHeaders(request?: NextRequest) {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(request),
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    Vary: 'Origin',
  };
}

export function handleOptions(request?: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
