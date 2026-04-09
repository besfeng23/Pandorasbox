import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion, type ChatMessage as LlmMessage } from '@/lib/llm/llm-client';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { handleApiError, requireUser } from '@/server/api-auth';
import {
  appendMessage,
  createConversation,
  getRecentContext,
} from '@/server/repositories/conversations';
import type { ChatRequest } from '@/contracts/chat';

function parseTextDelta(line: string): string {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1 || line.slice(0, colonIndex) !== '0') return '';
  const raw = line.slice(colonIndex + 1);
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object') return parsed.text || parsed.content || '';
    return '';
  } catch {
    return raw.replace(/^"|"$/g, '');
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as ChatRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400, headers: corsHeaders(request) });
    }

    const conversationId = body.conversationId || (await createConversation(user.uid, {
      agentId: body.agentId,
      workspaceId: body.workspaceId,
    }));

    await appendMessage(user.uid, conversationId, { role: 'user', content: message });

    const history = await getRecentContext(user.uid, conversationId);
    const llmMessages: LlmMessage[] = history.map((entry) => ({ role: entry.role, content: entry.content }));

    const llmResponse = await streamChatCompletion(llmMessages);
    if (!llmResponse.body) {
      return NextResponse.json({ error: 'No stream returned by LLM' }, { status: 502, headers: corsHeaders(request) });
    }

    const [clientStream, tapStream] = llmResponse.body.tee();
    let assistantContent = '';

    (async () => {
      const reader = tapStream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          assistantContent += parseTextDelta(line);
        }
      }
      if (buffer) {
        assistantContent += parseTextDelta(buffer);
      }
      if (assistantContent.trim()) {
        await appendMessage(user.uid, conversationId, { role: 'assistant', content: assistantContent.trim() });
      }
    })().catch((error) => {
      console.error('Failed to persist assistant message', error);
    });

    return new Response(clientStream, {
      status: 200,
      headers: {
        ...corsHeaders(request),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Conversation-Id': conversationId,
      },
    });
  } catch (error) {
    return handleApiError(error, request, '/api/chat failed');
  }
}
