import { NextRequest, NextResponse } from 'next/server';
import { deleteMemoryFromMemories, updateMemoryInMemories } from '@/app/actions';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { requireUser, unauthorizedResponse } from '@/server/api-auth';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const params = await props.params;
    const agentId = request.nextUrl.searchParams.get('agentId') || 'builder';
    const result = await deleteMemoryFromMemories(params.id, user.uid, agentId);
    return NextResponse.json(result, { headers: corsHeaders(request) });
  } catch {
    return unauthorizedResponse();
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const params = await props.params;
    const agentId = request.nextUrl.searchParams.get('agentId') || 'builder';
    const { content } = await request.json();
    const result = await updateMemoryInMemories(params.id, content, user.uid, agentId);
    return NextResponse.json(result, { headers: corsHeaders(request) });
  } catch {
    return unauthorizedResponse();
  }
}
