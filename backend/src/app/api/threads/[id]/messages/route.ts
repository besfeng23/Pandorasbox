import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { requireUser, unauthorizedResponse } from '@/server/api-auth';
import { listMessages } from '@/server/repositories/conversations';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const messages = await listMessages(user.uid, id);
    return NextResponse.json({ messages }, { headers: corsHeaders(request) });
  } catch {
    return unauthorizedResponse();
  }
}
