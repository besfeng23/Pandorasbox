import { NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  const embeddingsUrl = process.env.EMBEDDINGS_BASE_URL || 'http://localhost:8080';
  try {
    const res = await fetch(`${embeddingsUrl}/health`);
    if (res.ok) {
      return NextResponse.json({ status: 'online', service: 'Embeddings' }, { headers: corsHeaders() });
    }
    // Some lightweight servers may not have /health; treat any response as "reachable"
    return NextResponse.json({ status: 'online', service: 'Embeddings' }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error(`[Health Check] Embeddings Connection Error to ${embeddingsUrl}:`, error.message, error.cause || '');
    return NextResponse.json({ status: 'offline', error: `Connection failed: ${error.message}` }, { status: 503, headers: corsHeaders() });
  }
}


