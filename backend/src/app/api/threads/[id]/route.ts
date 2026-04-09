import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { requireUser, unauthorizedResponse } from '@/server/api-auth';
import { deleteConversation, getConversation, renameConversation } from '@/server/repositories/conversations';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const conversation = await getConversation(user.uid, id);
    if (!conversation) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404, headers: corsHeaders(request) });
    }
    return NextResponse.json({ thread: { id: conversation.id, name: conversation.name, agent: conversation.agentId, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt } }, { headers: corsHeaders(request) });
  } catch {
    return unauthorizedResponse();
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const name = (body.name || body.title || '').toString().trim();
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400, headers: corsHeaders(request) });
    }
    await renameConversation(user.uid, id, name);
    return NextResponse.json({ success: true }, { headers: corsHeaders(request) });
  } catch {
    return unauthorizedResponse();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    await deleteConversation(user.uid, id);
    return NextResponse.json({ success: true }, { headers: corsHeaders(request) });
  } catch {
    return unauthorizedResponse();
  }
}
