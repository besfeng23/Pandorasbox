import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { handleApiError, requireAdmin } from '@/server/api-auth';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const db = getFirestoreAdmin();

    const [userCount, conversationCount, memoryCount] = await Promise.all([
      db.collection('users').count().get(),
      db.collectionGroup('conversations').count().get(),
      db.collection('memories').count().get(),
    ]);

    return NextResponse.json({
      users: userCount.data().count,
      conversations: conversationCount.data().count,
      memories: memoryCount.data().count,
    });
  } catch (error) {
    return handleApiError(error, request, '/api/admin/stats GET failed');
  }
}
