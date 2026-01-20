import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin'; // Import for server-side Firestore
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

  const adminDb = getFirestoreAdmin();
  try {
    const snapshot = await adminDb.collection('api_clients').where('apiKey', '==', token).get();
    if (snapshot.empty) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }
    // If a client is found, proceed. No need to pass 'auth' object further based on plan.
  } catch (error) {
    console.error('Error verifying API Key:', error);
    return NextResponse.json({ error: 'Internal Server Error during API Key verification' }, { status: 500 });
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
