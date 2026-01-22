
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const firestoreAdmin = getFirestoreAdmin();
    
    // Security check: Verify user owns the thread
    const threadDoc = await firestoreAdmin.collection('threads').doc(threadId).get();
    if (!threadDoc.exists || threadDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const snapshot = await firestoreAdmin
      .collection('threads')
      .doc(threadId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();

    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString(),
    }));

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

