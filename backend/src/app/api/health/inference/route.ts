import { NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  // Support both INFERENCE_BASE_URL (preferred) and INFERENCE_URL (legacy)
  const baseUrl = process.env.INFERENCE_BASE_URL || process.env.INFERENCE_URL || 'http://localhost:8000';
  const inferenceUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
  try {
    const res = await fetch(`${inferenceUrl}/models`);
    if (res.ok) {
      return NextResponse.json({ status: 'online', service: 'vLLM' }, { headers: corsHeaders() });
    }
    return NextResponse.json({ status: 'offline', error: 'vLLM returned non-200' }, { status: 503, headers: corsHeaders() });
  } catch (error: any) {
    console.error(`[Health Check] vLLM Connection Error to ${inferenceUrl}:`, error.message, error.cause || '');
    return NextResponse.json({ status: 'offline', error: `Connection failed: ${error.message}` }, { status: 503, headers: corsHeaders() });
  }
}

