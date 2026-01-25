import { NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  try {
    const res = await fetch(`${qdrantUrl}/collections`);
    if (res.ok) {
      return NextResponse.json({ status: 'online', service: 'Qdrant' }, { headers: corsHeaders() });
    }
    return NextResponse.json({ status: 'offline', error: 'Qdrant returned non-200' }, { status: 503, headers: corsHeaders() });
  } catch (error) {
    return NextResponse.json({ status: 'offline', error: 'Connection failed' }, { status: 503, headers: corsHeaders() });
  }
}

