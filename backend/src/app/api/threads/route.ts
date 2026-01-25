import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { getUserThreads, createThread } from '@/app/actions';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const agentId = searchParams.get('agentId') || 'builder';

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400, headers: corsHeaders() });

  try {
    const threads = await getUserThreads(userId, agentId);
    return NextResponse.json({ threads }, { headers: corsHeaders() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, agent } = await request.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400, headers: corsHeaders() });
    
    const threadId = await createThread(userId, agent || 'builder');
    return NextResponse.json({ id: threadId }, { headers: corsHeaders() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}
