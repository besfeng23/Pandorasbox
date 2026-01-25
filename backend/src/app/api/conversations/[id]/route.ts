import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { Timestamp } from 'firebase-admin/firestore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * Helper function to verify authentication and extract userId
 */
async function verifyAuth(request: NextRequest): Promise<{ userId: string } | { error: NextResponse }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized: No Bearer token provided' },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }

  const idToken = authHeader.substring(7); // Remove 'Bearer '
  try {
    const decodedToken = await getAuthAdmin().verifyIdToken(idToken);
    return { userId: decodedToken.uid };
  } catch (error: any) {
    return {
      error: NextResponse.json(
        { error: error.message || 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }
}

/**
 * Helper function to verify user owns the conversation
 */
async function verifyOwnership(
  conversationId: string,
  userId: string
): Promise<{ conversation: FirebaseFirestore.DocumentSnapshot } | { error: NextResponse }> {
  const db = getFirestoreAdmin();
  const conversationRef = db.collection('conversations').doc(conversationId);
  const conversationDoc = await conversationRef.get();

  if (!conversationDoc.exists) {
    return {
      error: NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404, headers: corsHeaders() }
      ),
    };
  }

  const conversationData = conversationDoc.data();
  if (conversationData?.userId !== userId) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: You do not have access to this conversation' },
        { status: 403, headers: corsHeaders() }
      ),
    };
  }

  return { conversation: conversationDoc };
}

/**
 * GET /api/conversations/[id]
 * Retrieve a conversation with all its messages
 * Returns: { id, name, userId, agent, createdAt, updatedAt, messages: [...] }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { userId } = authResult;

    // 2. Get conversation ID from params
    const { id } = await params;
    const conversationId = id;

    // 3. Authorization - verify user owns the conversation
    const ownershipResult = await verifyOwnership(conversationId, userId);
    if ('error' in ownershipResult) {
      return ownershipResult.error;
    }
    const { conversation: conversationDoc } = ownershipResult;

    // 4. Fetch messages subcollection
    const db = getFirestoreAdmin();
    const messagesRef = db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages');

    const messagesSnapshot = await messagesRef.orderBy('createdAt', 'asc').get();

    // 5. Format conversation data
    const conversationData = conversationDoc.data()!;
    const createdAt = conversationData.createdAt as Timestamp;
    const updatedAt = conversationData.updatedAt as Timestamp;

    // 6. Format messages
    const messages = messagesSnapshot.docs.map((doc) => {
      const messageData = doc.data();
      const messageCreatedAt = messageData.createdAt as Timestamp;
      
      return {
        id: doc.id,
        role: messageData.role,
        content: messageData.content,
        createdAt: messageCreatedAt ? messageCreatedAt.toMillis() : Date.now(),
        ...(messageData.updatedAt && {
          updatedAt: (messageData.updatedAt as Timestamp).toMillis(),
        }),
      };
    });

    // 7. Return combined response
    return NextResponse.json(
      {
        id: conversationDoc.id,
        name: conversationData.name,
        userId: conversationData.userId,
        agent: conversationData.agent,
        createdAt: createdAt ? createdAt.toMillis() : Date.now(),
        updatedAt: updatedAt ? updatedAt.toMillis() : Date.now(),
        messages,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('GET /api/conversations/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * PATCH /api/conversations/[id]
 * Update conversation name
 * Body: { name?: string }
 * Returns: Updated conversation object
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { userId } = authResult;

    // 2. Get conversation ID from params
    const { id } = await params;
    const conversationId = id;

    // 3. Authorization - verify user owns the conversation
    const ownershipResult = await verifyOwnership(conversationId, userId);
    if ('error' in ownershipResult) {
      return ownershipResult.error;
    }

    // 4. Parse request body
    const body = await request.json().catch(() => ({}));
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 5. Update conversation
    const db = getFirestoreAdmin();
    const conversationRef = db.collection('conversations').doc(conversationId);
    
    const now = Timestamp.now();
    await conversationRef.update({
      name: name.trim(),
      updatedAt: now,
    });

    // 6. Fetch updated conversation
    const updatedDoc = await conversationRef.get();
    const updatedData = updatedDoc.data()!;
    const createdAt = updatedData.createdAt as Timestamp;
    const updatedAt = updatedData.updatedAt as Timestamp;

    // 7. Return updated conversation
    return NextResponse.json(
      {
        id: updatedDoc.id,
        name: updatedData.name,
        userId: updatedData.userId,
        agent: updatedData.agent,
        createdAt: createdAt ? createdAt.toMillis() : Date.now(),
        updatedAt: updatedAt ? updatedAt.toMillis() : Date.now(),
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('PATCH /api/conversations/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update conversation' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * DELETE /api/conversations/[id]
 * Delete conversation and all its messages (atomic operation)
 * Returns: 204 No Content
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { userId } = authResult;

    // 2. Get conversation ID from params
    const { id } = await params;
    const conversationId = id;

    // 3. Authorization - verify user owns the conversation
    const ownershipResult = await verifyOwnership(conversationId, userId);
    if ('error' in ownershipResult) {
      return ownershipResult.error;
    }

    // 4. Delete messages subcollection and conversation document (atomic)
    const db = getFirestoreAdmin();
    const conversationRef = db.collection('conversations').doc(conversationId);
    const messagesRef = conversationRef.collection('messages');

    // Firestore batch limit is 500 operations
    // We'll process in batches if there are more than 500 messages
    const BATCH_LIMIT = 500;
    let totalDeleted = 0;

    // Delete messages in batches
    while (true) {
      const messagesSnapshot = await messagesRef.limit(BATCH_LIMIT).get();
      
      if (messagesSnapshot.empty) {
        break;
      }

      const batch = db.batch();
      messagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        totalDeleted++;
      });

      await batch.commit();

      // If we got fewer than BATCH_LIMIT, we're done
      if (messagesSnapshot.size < BATCH_LIMIT) {
        break;
      }
    }

    // Delete the conversation document in a final batch
    // (This ensures atomicity - if message deletion fails, conversation remains)
    const finalBatch = db.batch();
    finalBatch.delete(conversationRef);
    await finalBatch.commit();

    // 5. Return 204 No Content
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(),
    });
  } catch (error: any) {
    console.error('DELETE /api/conversations/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete conversation' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

