import { NextRequest, NextResponse } from 'next/server';
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, agent } = await request.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400, headers: corsHeaders() });
    
    const result = await createThread(agent || 'builder', userId);
    return NextResponse.json({ id: result.id }, { headers: corsHeaders() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}
