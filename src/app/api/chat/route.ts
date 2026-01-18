import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/server/auth';
import { preCheck, postCheck } from '@/server/guardrails';
import { chatCompletion } from '@/server/inference-client';
import { isValidAgentId, getAgentConfig } from '@/lib/agent-types';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const auth = await verifyFirebaseToken(authHeader);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
