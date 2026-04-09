import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { requireUser, unauthorizedResponse } from '@/server/api-auth';
import { createConversation, listConversations } from '@/server/repositories/conversations';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const agentId = (request.nextUrl.searchParams.get('agentId') as 'builder' | 'universe' | null) ?? undefined;
    const conversations = await listConversations(user.uid);
    const filtered = agentId ? conversations.filter((c) => c.agentId === agentId) : conversations;
    return NextResponse.json({
      threads: filtered.map((c) => ({ id: c.id, name: c.name, agent: c.agentId, createdAt: c.createdAt, updatedAt: c.updatedAt })),
    }, { headers: corsHeaders(request) });
  } catch {
    return unauthorizedResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const id = await createConversation(user.uid, {
      name: body.name,
      agentId: body.agent || body.agentId,
      workspaceId: body.workspaceId,
    });
    return NextResponse.json({ id }, { status: 201, headers: corsHeaders(request) });
  } catch {
    return unauthorizedResponse();
  }
}
