
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const agent = searchParams.get('agent');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400, headers: corsHeaders() });
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

    return NextResponse.json({ threads }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('Error fetching threads:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, agent } = body;

    if (!userId || !agent) {
      return NextResponse.json({ error: 'userId and agent are required' }, { status: 400, headers: corsHeaders() });
    }

    const firestoreAdmin = getFirestoreAdmin();
    const now = new Date();
    
    const threadData = {
      userId,
      agent,
      name: 'New Thread',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      version: 1,
      history: [{
        action: 'create',
        userId,
        timestamp: now,
      }]
    };

    const docRef = await firestoreAdmin.collection('threads').add(threadData);

    return NextResponse.json({ 
        id: docRef.id,
        ...threadData,
        // Mock timestamps for immediate response
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
    }, { headers: corsHeaders() });

  } catch (error: any) {
    console.error('Error creating thread:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function OPTIONS() {
  return handleOptions();
}
