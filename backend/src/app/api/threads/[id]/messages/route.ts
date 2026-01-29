
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const threadId = id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400, headers: corsHeaders() });
    }

    const firestoreAdmin = getFirestoreAdmin();

    // Security check: Verify user owns the thread from the correct sub-collection
    const threadRef = firestoreAdmin.doc(`users/${userId}/threads/${threadId}`);
    const threadDoc = await threadRef.get();

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Access denied or thread not found' }, { status: 403, headers: corsHeaders() });
    }

    const snapshot = await threadRef
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();

    const messages = (snapshot?.docs || []).map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json({ messages }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function OPTIONS() {
  return handleOptions();
}

