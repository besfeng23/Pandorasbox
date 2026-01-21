import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin'; 
import { preCheck, postCheck } from '@/server/guardrails';
import { chatCompletion } from '@/server/inference-client';
import { isValidAgentId, getAgentConfig } from '@/lib/agent-types';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: No Bearer token provided' }, { status: 401 });
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Token is empty' }, { status: 401 });
  }

  // 1. Verify Authentication (Support both API Key and Firebase ID Token)
  let userId: string | undefined;
  const adminDb = getFirestoreAdmin();
  
  try {
    // Attempt 1: Check if it's a Firebase ID Token
    try {
        const decodedToken = await getAuthAdmin().verifyIdToken(token);
        userId = decodedToken.uid;
    } catch (jwtError) {
        // Not a valid JWT, fall back to API Key check
    }

    // Attempt 2: Check if it's an API Key (if not already verified as ID Token)
    if (!userId) {
        const snapshot = await adminDb.collection('api_clients').where('apiKey', '==', token).get();
        if (!snapshot.empty) {
            userId = 'api_client'; // Generic ID for API clients
        }
    }

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized: Invalid Token or API Key' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return NextResponse.json({ error: 'Internal Server Error during auth verification' }, { status: 500 });
  }

  const { message, agentId, threadId } = await request.json();
  if (!message || !isValidAgentId(agentId)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const preResult = preCheck(message, agentId);
  if (!preResult.allowed) {
    return NextResponse.json({ response: preResult.reason, blocked: true, agentId, threadId, streaming: false });
  }

  const config = getAgentConfig(agentId);
  const completion = await chatCompletion({
    messages: [
      { role: 'system', content: config.systemPrompt },
      { role: 'user', content: message },
    ],
  });

  const response = completion.choices[0].message.content;
  const postResult = postCheck(response, agentId);

  return NextResponse.json({
    agentId,
    threadId,
    response: postResult.allowed ? response : postResult.reason,
    blocked: !postResult.allowed,
    usage: completion.usage,
    streaming: false,
  });
}
