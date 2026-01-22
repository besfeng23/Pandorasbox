
import { NextRequest, NextResponse } from 'next/server';
import { deleteMemoryFromMemories, updateMemoryInMemories } from '@/app/actions';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id = '';
  try {
    const paramsResolved = await params;
    id = paramsResolved.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const agentId = searchParams.get('agentId') || 'builder';
    const { content } = await request.json();

    if (!userId || !content) {
      return NextResponse.json({ error: 'userId and content are required' }, { status: 400, headers: corsHeaders() });
    }

    const result = await updateMemoryInMemories(id, content, userId, agentId);
    return NextResponse.json(result, { headers: corsHeaders() });
  } catch (error: any) {
    console.error(`Error in PATCH /api/memories/${id}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id = '';
  try {
    const paramsResolved = await params;
    id = paramsResolved.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const agentId = searchParams.get('agentId') || 'builder';

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400, headers: corsHeaders() });
    }

    const result = await deleteMemoryFromMemories(id, userId, agentId);
    return NextResponse.json(result, { headers: corsHeaders() });
  } catch (error: any) {
    console.error(`Error in DELETE /api/memories/${id}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}

