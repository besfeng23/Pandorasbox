import { NextRequest, NextResponse } from 'next/server';
import { streamInference, ChatMessage } from '@/lib/sovereign/inference';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { OpenAIStream, StreamingTextResponse, StreamData } from 'ai';
import { preCheck } from '@/server/guardrails';
import { isValidAgentId, getAgentConfig } from '@/lib/agent-types';
import { searchMemoryAction } from '@/app/actions'; // For tool calls
import { handleOptions, corsHeaders } from '@/lib/cors';
import { FieldValue } from 'firebase-admin/firestore';
import { embedText } from '@/lib/ai/embedding';

export async function OPTIONS() {
  return handleOptions();
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
  const SOVEREIGN_PROMPT = `You are a private, air-gapped AI assistant running on Sovereign Infrastructure.
You are "Pandora", a helpful and intelligent AI.
- You do NOT have access to the public internet.
- You have access to a local knowledge base (memories).
- Always verify information from the provided Context.
- If the user asks a question, check the Context first.
- Keep responses concise and relevant.`;

  let initialMessages: ChatMessage[] = [
    { role: 'system', content: `${SOVEREIGN_PROMPT}\n\n${config.systemPrompt}` },
  ];

  const streamData = new StreamData();

  if (message.length > 5) {
      streamData.append({ type: 'tool_start', toolName: 'search_knowledge_base', display: 'Searching Knowledge Base...' });
      
      try {
        const queryResults = await searchMemoryAction(message, userId, agentId);
        
        if (queryResults.length > 0) {
            const formattedResults = queryResults.map(r => `[Memory ID: ${r.id}, Score: ${r.score.toFixed(2)}]\n${r.text}`).join('\n\n');
            
            initialMessages.push({ role: 'system', content: `CONTEXT FROM MEMORY:\n${formattedResults}\n\nEND CONTEXT` });
            streamData.append({ type: 'tool_end', toolName: 'search_knowledge_base', status: 'success', result: `Found ${queryResults.length} memories.` });
        } else {
            streamData.append({ type: 'tool_end', toolName: 'search_knowledge_base', status: 'success', result: 'No relevant memories found.' });
        }
      } catch (toolError: any) {
        console.error('Error during search_knowledge_base tool call:', toolError);
        streamData.append({ type: 'tool_end', toolName: 'search_knowledge_base', status: 'error', error: toolError.message });
      }
  }

  initialMessages.push({ role: 'user', content: message });

  const stream = await streamInference(initialMessages);

  const aiStream = OpenAIStream(stream as any, {
    async onFinal(completion) {
      await streamData.close();
      
      // Save assistant response to Firestore
      if (threadId) {
        try {
            const firestoreAdmin = getFirestoreAdmin();
            const historyCollection = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/history`);
            const embedding = await embedText(completion);
            
            const assistantMessage = {
                role: 'assistant',
                content: completion,
                createdAt: FieldValue.serverTimestamp(),
                userId: userId,
                threadId: threadId,
                embedding: embedding,
                source: 'inference',
            };
            
            const docRef = await historyCollection.add(assistantMessage);
            await docRef.update({ id: docRef.id });
        } catch (saveError) {
            console.error('Failed to save assistant response to Firestore:', saveError);
        }
      }
    },
    experimental_streamData: true,
  });

  return new StreamingTextResponse(aiStream, { headers: { ...corsHeaders() } });
}
