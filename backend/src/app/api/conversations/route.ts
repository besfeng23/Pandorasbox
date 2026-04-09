import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { handleApiError, requireUser } from '@/server/api-auth';
import { createConversation, listConversations } from '@/server/repositories/conversations';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const conversations = await listConversations(user.uid);
    return NextResponse.json({ conversations }, { headers: corsHeaders(request) });
  } catch (error) {
    return handleApiError(error, request, '/api/conversations GET failed');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const id = await createConversation(user.uid, {
      name: body.name,
      agentId: body.agentId,
      workspaceId: body.workspaceId,
    });

    return NextResponse.json({ id }, { status: 201, headers: corsHeaders(request) });
  } catch (error) {
    return handleApiError(error, request, '/api/conversations POST failed');
  }
}
