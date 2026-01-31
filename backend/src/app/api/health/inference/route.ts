import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  // Support both INFERENCE_BASE_URL (preferred) and INFERENCE_URL (legacy)
  const baseUrl = process.env.INFERENCE_BASE_URL || process.env.INFERENCE_URL;

  // If no custom URL is set, check if we have an OpenAI API key.
  // If we do, we assume we are using OpenAI and return "online".
  if (!baseUrl) {
    if (process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.LLM_API_KEY) {
      return NextResponse.json({ status: 'online', service: 'OpenAI (Default)' }, { headers: corsHeaders() });
    }
    // If neither is set, we might be in a bad state, but let's default to trying localhost just in case,
    // or failing gracefully.
    // For safety, if no config at all, report offline.
    return NextResponse.json({ status: 'offline', error: 'No Inference URL or OpenAI Key configured' }, { status: 503, headers: corsHeaders() });
  }

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

