import { NextRequest, NextResponse } from 'next/server';
import { deleteMemoryFromMemories, updateMemoryInMemories } from '@/app/actions';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const agentId = searchParams.get('agentId') || 'builder';
  const id = params.id;

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400, headers: corsHeaders() });

  try {
    const result = await deleteMemoryFromMemories(id, userId, agentId);
    return NextResponse.json(result, { headers: corsHeaders() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const agentId = searchParams.get('agentId') || 'builder';
  const id = params.id;

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400, headers: corsHeaders() });

  try {
    const { content } = await request.json();
    const result = await updateMemoryInMemories(id, content, userId, agentId);
    return NextResponse.json(result, { headers: corsHeaders() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}
