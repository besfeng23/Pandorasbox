import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebase-admin';
import { submitFeedback } from '@/lib/feedback-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

/**
 * POST /api/feedback
 * 
 * Submit feedback for a search query.
 * 
 * Request body:
 * {
 *   "query": "search query",
 *   "user_email": "user@example.com",
 *   "result_ids": ["id1", "id2"],
 *   "satisfaction": 0.8, // 0-1 scale
 *   "feedback": "Optional text feedback"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('x-api-key');

    if (!apiKey || apiKey !== process.env.CHATGPT_API_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid API key.' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const body = await request.json();
    const { query, user_email, result_ids, satisfaction, feedback, context } = body;

    if (!query || satisfaction === undefined) {
      return NextResponse.json(
        { error: 'Query and satisfaction are required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (satisfaction < 0 || satisfaction > 1) {
      return NextResponse.json(
        { error: 'Satisfaction must be between 0 and 1.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const userEmail = user_email || 'joven.ong23@gmail.com';
    const authAdmin = getAuthAdmin();
    let firebaseUser;
    
    try {
      firebaseUser = await authAdmin.getUserByEmail(userEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: `User with email ${userEmail} not found.` },
          { status: 404, headers: corsHeaders() }
        );
      }
      throw error;
    }

    const userId = firebaseUser.uid;

    await submitFeedback({
      query,
      userId,
      resultIds: result_ids || [],
      satisfaction,
      feedback,
      context,
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
      userId,
    }, { headers: corsHeaders() });

  } catch (error: any) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { error: 'Failed to record feedback', details: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * GET /api/feedback?user_email=...
 * 
 * Get feedback history for a user.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('x-api-key');

    if (!apiKey || apiKey !== process.env.CHATGPT_API_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid API key.' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userEmail = searchParams.get('user_email') || 'joven.ong23@gmail.com';

    const authAdmin = getAuthAdmin();
    let firebaseUser;
    
    try {
      firebaseUser = await authAdmin.getUserByEmail(userEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: `User with email ${userEmail} not found.` },
          { status: 404, headers: corsHeaders() }
        );
      }
      throw error;
    }

    const userId = firebaseUser.uid;
    const { getUserFeedback } = await import('@/lib/feedback-manager');
    const feedback = await getUserFeedback(userId, 20);

    return NextResponse.json({
      success: true,
      userId,
      count: feedback.length,
      feedback,
    }, { headers: corsHeaders() });

  } catch (error: any) {
    console.error('Error in feedback GET API:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve feedback', details: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

