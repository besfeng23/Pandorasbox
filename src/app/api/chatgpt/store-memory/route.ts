import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebase-admin';

// Prevent this route from being statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * ChatGPT Action API: Store Memory
 * 
 * This endpoint allows ChatGPT to store memories in the Pandora's Box system.
 * 
 * Authentication: Uses API key in Authorization header
 * User Mapping: Maps ChatGPT user email to Firebase user account
 * 
 * Request Body:
 * {
 *   "memory": "The user prefers dark mode interfaces",
 *   "user_email": "joven.ong23@gmail.com" (optional, defaults to configured email)
 * }
 */
// CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('x-api-key');
    
    if (!apiKey || apiKey !== process.env.CHATGPT_API_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid API key.' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const body = await request.json();
    const { memory, user_email } = body;

    if (!memory || typeof memory !== 'string' || !memory.trim()) {
      return NextResponse.json(
        { error: 'Invalid request. "memory" field is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    // Default to configured email if not provided
    const targetEmail = user_email || 'joven.ong23@gmail.com';

    // Get Firebase user by email
    const authAdmin = getAuthAdmin();
    let firebaseUser;
    try {
      firebaseUser = await authAdmin.getUserByEmail(targetEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: `User with email ${targetEmail} not found. Please ensure the user account exists in Firebase.` },
          { status: 404 }
        );
      }
      throw error;
    }

    const userId = firebaseUser.uid;

    // Use centralized memory utility to ensure automatic indexing
    const { saveMemory } = await import('@/lib/memory-utils');
    
    const result = await saveMemory({
      content: memory.trim(),
      userId: userId,
      source: 'chatgpt',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Failed to store memory' },
        { status: 500, headers: corsHeaders() }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Memory stored successfully',
      memory_id: result.memory_id,
      user_id: userId,
    }, { headers: corsHeaders() });

  } catch (error: any) {
    console.error('Error storing memory from ChatGPT:', error);
    return NextResponse.json(
      { error: 'Failed to store memory', details: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// Support GET for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'ChatGPT Memory Store API',
    endpoint: '/api/chatgpt/store-memory',
    method: 'POST',
    description: 'Store a memory in the Pandora\'s Box system',
    required_headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json',
    },
    request_body: {
      memory: 'string (required) - The memory content to store',
      user_email: 'string (optional) - User email, defaults to joven.ong23@gmail.com',
    },
  }, { headers: corsHeaders() });
}

