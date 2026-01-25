import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/conversations
 * List all conversations (threads) for the authenticated user
 * Returns: { id: string, name: string, updatedAt: number }[]
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: No Bearer token provided' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer '
    let userId: string;
    try {
      const decodedToken = await getAuthAdmin().verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // 2. Query conversations collection
    const db = getFirestoreAdmin();
    const conversationsRef = db.collection('conversations');
    
    const snapshot = await conversationsRef
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();

    // 3. Format response
    const conversations = snapshot.docs.map((doc) => {
      const data = doc.data();
      const updatedAt = data.updatedAt as Timestamp;
      
      return {
        id: doc.id,
        name: data.name || 'New Chat',
        updatedAt: updatedAt ? updatedAt.toMillis() : Date.now(),
      };
    });

    return NextResponse.json(conversations, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('GET /api/conversations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * POST /api/conversations
 * Create a new conversation (thread)
 * Body: { name?: string, agentId?: 'builder' | 'universe' }
 * Returns: { id: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: No Bearer token provided' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer '
    let userId: string;
    try {
      const decodedToken = await getAuthAdmin().verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const name = body.name || 'New Chat';
    const agentId = body.agentId || 'universe';

    // Validate agentId
    if (agentId !== 'builder' && agentId !== 'universe') {
      return NextResponse.json(
        { error: 'Invalid agentId. Must be "builder" or "universe"' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 3. Create conversation document
    const db = getFirestoreAdmin();
    const conversationsRef = db.collection('conversations');
    
    const now = Timestamp.now();
    const conversationData = {
      userId,
      name,
      agent: agentId,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await conversationsRef.add(conversationData);

    // 4. Return conversation ID
    return NextResponse.json(
      { id: docRef.id },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('POST /api/conversations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

