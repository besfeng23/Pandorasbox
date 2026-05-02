import { NextRequest, NextResponse } from 'next/server';
import { getMemoryJanitor } from '@/lib/hybrid/memory-janitor';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { requireCron, requireUser, handleApiError } from '@/server/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    let userId: string;
    let agentId = 'universe';

    try {
      const user = await requireUser(request);
      userId = user.uid;
      const body = await request.json().catch(() => ({}));
      if (typeof body.agentId === 'string') agentId = body.agentId;
    } catch {
      requireCron(request);
      const body = await request.json();
      if (!body?.userId) return NextResponse.json({ error: 'userId is required for cron requests' }, { status: 400 });
      userId = body.userId;
      if (typeof body.agentId === 'string') agentId = body.agentId;
    }

    const result = await getMemoryJanitor().run(userId, agentId);
    return NextResponse.json({ success: true, userId: userId.slice(0, 8) + '...', agentId, result });
  } catch (error) {
    return handleApiError(error);
  }
}
