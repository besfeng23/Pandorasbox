import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion, type ChatMessage as LlmMessage } from '@/lib/llm/llm-client';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { handleApiError, requireUser } from '@/server/api-auth';
import {
  appendMessage,
  createConversation,
  getRecentContext,
} from '@/server/repositories/conversations';
import type { ChatMessageMetadata, ChatRequest, ChatToolUsage } from '@/contracts/chat';

const MAX_METADATA_STRING_LENGTH = 8_000;
const MAX_REASONING_LENGTH = 12_000;
const MAX_METADATA_ARRAY_ITEMS = 25;
const MAX_METADATA_OBJECT_KEYS = 50;
const MAX_METADATA_DEPTH = 6;
const TRUNCATED_SUFFIX = '\n…[truncated]';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function truncateString(value: string, maxLength = MAX_METADATA_STRING_LENGTH) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}${TRUNCATED_SUFFIX}` : value;
}

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return truncateString(value);
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') return undefined;
  if (depth >= MAX_METADATA_DEPTH) return '[truncated: max depth]';

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_METADATA_ARRAY_ITEMS)
      .map((item) => sanitizeMetadataValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (!isRecord(value)) return String(value);

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value).slice(0, MAX_METADATA_OBJECT_KEYS)) {
    const sanitizedValue = sanitizeMetadataValue(nestedValue, depth + 1);
    if (sanitizedValue !== undefined) sanitized[key] = sanitizedValue;
  }
  return sanitized;
}

function normalizeToolUsage(value: unknown): ChatToolUsage | null {
  if (!isRecord(value)) return null;
  const rawName = value.toolName || value.name || value.tool || value.type;
  if (typeof rawName !== 'string' || !rawName.trim()) return null;

  const tool: ChatToolUsage = { toolName: truncateString(rawName.trim(), 256) };
  const input = sanitizeMetadataValue(value.input ?? value.args ?? value.arguments);
  const output = sanitizeMetadataValue(value.output ?? value.result ?? value.data);
  if (input !== undefined) tool.input = input;
  if (output !== undefined) tool.output = output;
  if (typeof value.citation === 'string' && value.citation.trim()) tool.citation = truncateString(value.citation.trim(), 2_000);
  return tool;
}

function extractStreamMetadata(payload: unknown): ChatMessageMetadata | undefined {
  const records = Array.isArray(payload) ? payload.filter(isRecord) : isRecord(payload) ? [payload] : [];
  const toolUsages: ChatToolUsage[] = [];
  const reasoningParts: string[] = [];

  for (const record of records) {
    const reasoning = record.reasoning ?? record.thought ?? record.thinking;
    if (typeof reasoning === 'string' && reasoning.trim()) reasoningParts.push(reasoning.trim());

    const directTool = normalizeToolUsage(record);
    if (directTool) toolUsages.push(directTool);

    const nestedTools = record.toolUsages ?? record.tools ?? record.tool_calls ?? record.toolCalls;
    if (Array.isArray(nestedTools)) {
      for (const nestedTool of nestedTools) {
        const normalized = normalizeToolUsage(nestedTool);
        if (normalized) toolUsages.push(normalized);
      }
    }
  }

  const metadata: ChatMessageMetadata = {};
  if (reasoningParts.length > 0) metadata.reasoning = truncateString(reasoningParts.join('\n\n'), MAX_REASONING_LENGTH);
  if (toolUsages.length > 0) metadata.toolUsages = toolUsages.slice(0, MAX_METADATA_ARRAY_ITEMS);
  return metadata.reasoning || metadata.toolUsages?.length ? metadata : undefined;
}

function mergeMetadata(current: ChatMessageMetadata | undefined, next: ChatMessageMetadata | undefined): ChatMessageMetadata | undefined {
  if (!next) return current;
  const metadata: ChatMessageMetadata = {};
  const reasoning = [current?.reasoning, next.reasoning].filter(Boolean).join('\n\n');
  if (reasoning) metadata.reasoning = truncateString(reasoning, MAX_REASONING_LENGTH);
  const toolUsages = [...(current?.toolUsages || []), ...(next.toolUsages || [])];
  if (toolUsages.length > 0) metadata.toolUsages = toolUsages.slice(0, MAX_METADATA_ARRAY_ITEMS);
  return metadata.reasoning || metadata.toolUsages?.length ? metadata : undefined;
}

function parseDataPayload(line: string): unknown | undefined {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1 || line.slice(0, colonIndex) !== '2') return undefined;
  const raw = line.slice(colonIndex + 1);
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function parseTextDelta(line: string): string {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1 || line.slice(0, colonIndex) !== '0') return '';
  const raw = line.slice(colonIndex + 1);
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object') {
      const candidate = parsed as { text?: unknown; content?: unknown };
      return typeof candidate.text === 'string' ? candidate.text : typeof candidate.content === 'string' ? candidate.content : '';
    }
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
    let assistantMetadata: ChatMessageMetadata | undefined;

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
          assistantMetadata = mergeMetadata(assistantMetadata, extractStreamMetadata(parseDataPayload(line)));
        }
      }
      if (buffer) {
        assistantContent += parseTextDelta(buffer);
        assistantMetadata = mergeMetadata(assistantMetadata, extractStreamMetadata(parseDataPayload(buffer)));
      }
      if (assistantContent.trim()) {
        await appendMessage(user.uid, conversationId, { role: 'assistant', content: assistantContent.trim(), metadata: assistantMetadata });
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
