import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { searchMemoryAction, createMemoryFromSettings } from '@/app/actions';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const agentId = searchParams.get('agentId') || 'builder';
  const query = searchParams.get('query') || '';

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400, headers: corsHeaders() });
  }

  // Verify token if strictly needed, but for internal microservice pattern (frontend->backend)
  // usually we trust the passed userId if secured by network or shared secret.
  // Ideally, frontend passes the ID Token in Authorization header.
  
  // Reuse the logic from actions.ts which wraps Qdrant
  try {
    const results = await searchMemoryAction(query, userId, agentId);
    return NextResponse.json(results, { headers: corsHeaders() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const agentId = searchParams.get('agentId') || 'builder';
  
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400, headers: corsHeaders() });

  try {
    const { content } = await request.json();
    const result = await createMemoryFromSettings(content, userId, agentId);
    return NextResponse.json(result, { headers: corsHeaders() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}
