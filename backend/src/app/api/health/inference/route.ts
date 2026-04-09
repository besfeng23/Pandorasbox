import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.INFERENCE_BASE_URL || process.env.INFERENCE_URL || 'http://localhost:8000';
  const inferenceUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;

  try {
    const res = await fetch(`${inferenceUrl}/models`, { method: 'GET' });
    const status = res.ok ? 'ok' : 'degraded';
    const code = res.ok ? 200 : 503;
    return NextResponse.json({ status }, { status: code, headers: corsHeaders(request) });
  } catch {
    return NextResponse.json({ status: 'degraded' }, { status: 503, headers: corsHeaders(request) });
  }
}
