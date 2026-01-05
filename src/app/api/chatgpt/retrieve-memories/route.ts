import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { searchHistory, generateEmbedding } from '@/lib/vector';

// Prevent this route from being statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * ChatGPT Action API: Retrieve Memories
 * 
 * This endpoint allows ChatGPT to retrieve relevant memories from the Pandora's Box system.
 * 
 * Authentication: Uses API key in Authorization header
 * User Mapping: Maps ChatGPT user email to Firebase user account
 * 
 * Query Parameters:
 * - query: Search query (optional, if not provided returns recent memories)
 * - user_email: User email (optional, defaults to configured email)
 * - limit: Maximum number of memories to return (default: 10, max: 50)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify API key
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('x-api-key');
    
    if (!apiKey || apiKey !== process.env.CHATGPT_API_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid API key.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const userEmail = searchParams.get('user_email') || 'joven.ong23@gmail.com';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // Get Firebase user by email
    const authAdmin = getAuthAdmin();
    let firebaseUser;
    try {
      firebaseUser = await authAdmin.getUserByEmail(userEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: `User with email ${userEmail} not found. Please ensure the user account exists in Firebase.` },
          { status: 404 }
        );
      }
      throw error;
    }

    const userId = firebaseUser.uid;
    const firestoreAdmin = getFirestoreAdmin();

    let memories;

    if (query.trim()) {
      // Semantic search using vector embeddings
      const searchResults = await searchHistory(query, userId);
      memories = searchResults.slice(0, limit).map(result => ({
        id: result.id,
        content: result.text,
        relevance_score: result.score,
        timestamp: result.timestamp.toISOString(),
      }));
    } else {
      // Get recent memories from the memories collection
      const memoriesSnapshot = await firestoreAdmin
        .collection('memories')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      memories = memoriesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          content: data.content,
          timestamp: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      });
    }

    return NextResponse.json({
      success: true,
      count: memories.length,
      memories: memories,
      user_id: userId,
    });

  } catch (error: any) {
    console.error('Error retrieving memories from ChatGPT:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve memories', details: error.message },
      { status: 500 }
    );
  }
}

// Support POST for ChatGPT Actions (some prefer POST)
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('x-api-key');
    
    if (!apiKey || apiKey !== process.env.CHATGPT_API_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid API key.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query, user_email, limit } = body;

    const userEmail = user_email || 'joven.ong23@gmail.com';
    const searchQuery = query || '';
    const resultLimit = Math.min(limit || 10, 50);

    // Get Firebase user by email
    const authAdmin = getAuthAdmin();
    let firebaseUser;
    try {
      firebaseUser = await authAdmin.getUserByEmail(userEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: `User with email ${userEmail} not found. Please ensure the user account exists in Firebase.` },
          { status: 404 }
        );
      }
      throw error;
    }

    const userId = firebaseUser.uid;
    const firestoreAdmin = getFirestoreAdmin();

    let memories;

    if (searchQuery.trim()) {
      // Semantic search using vector embeddings
      const searchResults = await searchHistory(searchQuery, userId);
      memories = searchResults.slice(0, resultLimit).map(result => ({
        id: result.id,
        content: result.text,
        relevance_score: result.score,
        timestamp: result.timestamp.toISOString(),
      }));
    } else {
      // Get recent memories
      const memoriesSnapshot = await firestoreAdmin
        .collection('memories')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(resultLimit)
        .get();

      memories = memoriesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          content: data.content,
          timestamp: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      });
    }

    return NextResponse.json({
      success: true,
      count: memories.length,
      memories: memories,
      user_id: userId,
    });

  } catch (error: any) {
    console.error('Error retrieving memories from ChatGPT:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve memories', details: error.message },
      { status: 500 }
    );
  }
}

