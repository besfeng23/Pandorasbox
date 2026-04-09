import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  try {
    const res = await fetch(`${qdrantUrl}/collections`, { method: 'GET' });
    const status = res.ok ? 'ok' : 'degraded';
    const code = res.ok ? 200 : 503;
    return NextResponse.json({ status }, { status: code, headers: corsHeaders(request) });
  } catch {
    return NextResponse.json({ status: 'degraded' }, { status: 503, headers: corsHeaders(request) });
  }
}
