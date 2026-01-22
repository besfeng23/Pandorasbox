
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
    const threadDoc = await firestoreAdmin.collection('threads').doc(threadId).get();

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const data = threadDoc.data();
    if (data?.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const thread = {
      id: threadDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate().toISOString(),
      updatedAt: data?.updatedAt?.toDate().toISOString(),
    };

    return NextResponse.json({ thread });
  } catch (error: any) {
    console.error('Error fetching thread:', error);
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

