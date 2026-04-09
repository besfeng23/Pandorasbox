import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { handleApiError, requireUser } from '@/server/api-auth';
import {
  deleteConversation,
  getConversation,
  listMessages,
  renameConversation,
} from '@/server/repositories/conversations';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const conversation = await getConversation(user.uid, id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404, headers: corsHeaders(request) });
    }

    const messages = await listMessages(user.uid, id);
    return NextResponse.json({ conversation, messages }, { headers: corsHeaders(request) });
  } catch (error) {
    return handleApiError(error, request, '/api/conversations/[id] GET failed');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400, headers: corsHeaders(request) });
    }

    await renameConversation(user.uid, id, name);
    const conversation = await getConversation(user.uid, id);
    return NextResponse.json({ conversation }, { headers: corsHeaders(request) });
  } catch (error) {
    return handleApiError(error, request, '/api/conversations/[id] PATCH failed');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    await deleteConversation(user.uid, id);
    return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
  } catch (error) {
    return handleApiError(error, request, '/api/conversations/[id] DELETE failed');
  }
}
