
import { NextRequest, NextResponse } from 'next/server';
import { fetchMemories, createMemoryFromSettings } from '@/app/actions';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const agentId = searchParams.get('agentId') || 'builder';
    const query = searchParams.get('query') || '';

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400, headers: corsHeaders() });
    }

    const memories = await fetchMemories(userId, agentId, query);
    return NextResponse.json(memories, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('Error in GET /api/memories:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const agentId = searchParams.get('agentId') || 'builder';
    const { content } = await request.json();

    if (!userId || !content) {
      return NextResponse.json({ error: 'userId and content are required' }, { status: 400, headers: corsHeaders() });
    }

    const result = await createMemoryFromSettings(content, userId, agentId);
    return NextResponse.json(result, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('Error in POST /api/memories:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}

