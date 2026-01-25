import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { logEvent } from '@/lib/observability/logger';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const { messageId, rating, correction, prompt, response } = await request.json();

    if (!messageId || !rating) {
      return NextResponse.json({ error: 'Missing messageId or rating' }, { status: 400, headers: corsHeaders() });
    }

    const adminDb = getFirestoreAdmin();
    const trainingRef = adminDb.collection('training_pairs').doc();

    const trainingData = {
      messageId,
      rating, // 'good' | 'bad'
      correction: correction || null,
      prompt: prompt || null,
      response: response || null,
      createdAt: new Date().toISOString(),
      status: 'pending_review'
    };

    await trainingRef.set(trainingData);

    logEvent('AI_REQUEST', {
        type: 'FEEDBACK_RECEIVED',
        rating,
        messageId
    });

    return NextResponse.json({ success: true, id: trainingRef.id }, { headers: corsHeaders() });

  } catch (error: any) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save feedback' }, { status: 500, headers: corsHeaders() });
  }
}


