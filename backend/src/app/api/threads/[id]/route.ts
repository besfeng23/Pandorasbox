
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = await params.id;
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = await params.id;
    const body = await request.json();
    const { userId, name } = body;

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name are required' }, { status: 400 });
    }

    const firestoreAdmin = getFirestoreAdmin();
    const threadRef = firestoreAdmin.collection('threads').doc(threadId);
    const threadDoc = await threadRef.get();

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (threadDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await threadRef.update({
      name: name,
      updatedAt: FieldValue.serverTimestamp(),
      version: FieldValue.increment(1),
      history: FieldValue.arrayUnion({
        action: 'rename',
        userId,
        timestamp: new Date(),
        changes: { name }
      })
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error renaming thread:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = await params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const firestoreAdmin = getFirestoreAdmin();
    const threadRef = firestoreAdmin.collection('threads').doc(threadId);
    const threadDoc = await threadRef.get();

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (threadDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete subcollection messages first (optional but good practice)
    const messagesSnapshot = await threadRef.collection('messages').get();
    const batch = firestoreAdmin.batch();
    messagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    // Delete thread
    batch.delete(threadRef);
    
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting thread:', error);
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
