
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const firestoreAdmin = getFirestoreAdmin();
    const snapshot = await firestoreAdmin
      .collection('users')
      .doc(userId)
      .collection('connectors')
      .get();

    const connectors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      updatedAt: doc.data().updatedAt?.toDate().toISOString(),
      createdAt: doc.data().createdAt?.toDate().toISOString(),
    }));

    return NextResponse.json({ connectors });
  } catch (error: any) {
    console.error('Error fetching connectors:', error);
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

