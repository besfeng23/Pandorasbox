import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebase-admin';
import { runHybridLane } from '@/ai/flows/run-hybrid-lane';

// Prevent this route from being statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

/**
 * ChatGPT Action API: Hybrid Retrieve (Internal + External Knowledge)
 * 
 * This endpoint performs hybrid search combining internal memories with
 * external web knowledge (Tavily) and returns fused results.
 * 
 * Authentication: Uses API key in Authorization header
 * User Mapping: Maps ChatGPT user email to Firebase user account
 * 
 * Request Body (POST):
 * - query: Search query (required)
 * - user_email: User email (optional, defaults to configured email)
 * - limit: Maximum number of results to return (default: 10, max: 50)
 */
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
    const { query, user_email, limit } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { error: 'Missing required parameter: query' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const userEmail = user_email || process.env.DEFAULT_CHATGPT_USER_EMAIL || 'user@example.com';
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
          { status: 404, headers: corsHeaders() }
        );
      }
      throw error;
    }

    const userId = firebaseUser.uid;

    // Run hybrid lane to get fused results
    const hybridResults = await runHybridLane({
      query: query.trim(),
      userId,
      limit: resultLimit,
    });

    return NextResponse.json({
      success: true,
      query: query.trim(),
      count: hybridResults.fusedResults.length,
      internal_count: hybridResults.internalCount,
      external_count: hybridResults.externalCount,
      results: hybridResults.fusedResults,
      fused_context: hybridResults.fusedContext,
      user_id: userId,
    }, { headers: corsHeaders() });

  } catch (error: any) {
    console.error('Error in hybrid retrieve from ChatGPT:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve hybrid knowledge', details: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * Support GET for compatibility (uses query parameters)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const userEmail = searchParams.get('user_email') || process.env.DEFAULT_CHATGPT_USER_EMAIL || 'user@example.com';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Missing required parameter: query' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Get Firebase user by email
    const authAdmin = getAuthAdmin();
    let firebaseUser;
    try {
      firebaseUser = await authAdmin.getUserByEmail(userEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: `User with email ${userEmail} not found. Please ensure the user account exists in Firebase.` },
          { status: 404, headers: corsHeaders() }
        );
      }
      throw error;
    }

    const userId = firebaseUser.uid;

    // Run hybrid lane to get fused results
    const hybridResults = await runHybridLane({
      query: query.trim(),
      userId,
      limit,
    });

    return NextResponse.json({
      success: true,
      query: query.trim(),
      count: hybridResults.fusedResults.length,
      internal_count: hybridResults.internalCount,
      external_count: hybridResults.externalCount,
      results: hybridResults.fusedResults,
      fused_context: hybridResults.fusedContext,
      user_id: userId,
    }, { headers: corsHeaders() });

  } catch (error: any) {
    console.error('Error in hybrid retrieve from ChatGPT:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve hybrid knowledge', details: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

