import { NextRequest, NextResponse } from 'next/server';
import { streamInference, ChatMessage } from '@/lib/sovereign/vllm-client';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { OpenAIStream, StreamingTextResponse, StreamData } from 'ai';
import { preCheck, postCheck } from '@/server/guardrails';
import { isValidAgentId, getAgentConfig } from '@/lib/agent-types';
import { searchMemoryAction } from '@/app/actions'; // For tool calls
import { embedText } from '@/lib/ai/embedding'; // For embedding search queries

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

// CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: No Bearer token provided' }, { status: 401, headers: corsHeaders() });
  }

  const idToken = authHeader.substring(7); // Remove 'Bearer '
  let userId: string;
  try {
    const decodedToken = await getAuthAdmin().verifyIdToken(idToken);
    userId = decodedToken.uid;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401, headers: corsHeaders() });
  }
  const { message, agentId, threadId } = await request.json();

  if (!message || !isValidAgentId(agentId)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: corsHeaders() });
  }

  const preResult = preCheck(message, agentId);
      if (!preResult.allowed) {
        return new StreamingTextResponse(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(preResult.reason)
              );
              controller.close();
            },
          }),
          { headers: corsHeaders() }
        );
      }

  const config = getAgentConfig(agentId);
  let initialMessages: ChatMessage[] = [
    { role: 'system', content: config.systemPrompt },
  ];

  const streamData = new StreamData();

  // Simulate tool use: search_knowledge_base
  if (message.toLowerCase().includes('search memory') || message.toLowerCase().includes('search knowledge base')) {
    streamData.append({ type: 'tool_start', toolName: 'search_knowledge_base', display: 'Searching Knowledge Base...' });
    try {
      // userId is already extracted from token above
      const queryResults = await searchMemoryAction(message, userId, agentId);
      const formattedResults = queryResults.map(r => `[Memory ID: ${r.id}, Score: ${r.score}, Source: ${r.source}]\n${r.text}`).join('\n\n');
      
      initialMessages.push({ role: 'system', content: `Found relevant knowledge:
${formattedResults}
` });
      streamData.append({ type: 'tool_end', toolName: 'search_knowledge_base', status: 'success' });
    } catch (toolError: any) {
      console.error('Error during search_knowledge_base tool call:', toolError);
      streamData.append({ type: 'tool_end', toolName: 'search_knowledge_base', status: 'error', error: toolError.message });
      // Optionally, add an error message to the prompt or stream it to the user
      initialMessages.push({ role: 'system', content: `Failed to search knowledge base: ${toolError.message}` });
    }
  }

  initialMessages.push({ role: 'user', content: message });

  const stream = await streamInference({
    messages: initialMessages,
  });

  const aiStream = OpenAIStream(stream as any, {
    async onFinal() {
      await streamData.close();
    },
    experimental_streamData: true,
  });

  return new StreamingTextResponse(aiStream, { headers: { ...corsHeaders() } });
}
