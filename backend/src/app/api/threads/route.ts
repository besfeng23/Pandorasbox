
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const agent = searchParams.get('agent');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const firestoreAdmin = getFirestoreAdmin();
    let query = firestoreAdmin.collection('threads').where('userId', '==', userId);
    
    if (agent) {
      query = query.where('agent', '==', agent);
    }

    const snapshot = await query
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();

    const threads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert timestamps to ISO strings for JSON serialization
      createdAt: doc.data().createdAt?.toDate().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate().toISOString(),
    }));

    return NextResponse.json({ threads });
  } catch (error: any) {
    console.error('Error fetching threads:', error);
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

