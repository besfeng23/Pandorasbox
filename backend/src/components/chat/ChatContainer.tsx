'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { FileText, Loader2, Sparkles, Square, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useArtifactStore } from '@/store/artifacts';
import { consumeChatStream } from './stream-utils';
import type { ChatMessageMetadata } from '@/contracts/chat';

export interface ChatToolUsage {
  toolName: string;
  input?: unknown;
  output?: unknown;
  citation?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  reasoning?: string;
  toolUsages?: ChatToolUsage[];
  metadata?: ChatMessageMetadata;
}

interface ChatContainerProps {
  initialConversationId?: string | null;
}

type ApiChatMessage = {
  role: ChatMessage['role'];
  content: string;
  id?: string;
  reasoning?: string;
  toolUsages?: ChatToolUsage[];
  metadata?: ChatMessageMetadata;
};

function isApiChatMessage(message: unknown): message is ApiChatMessage {
  if (!message || typeof message !== 'object') return false;
  const candidate = message as Partial<ApiChatMessage>;
  return (candidate.role === 'user' || candidate.role === 'assistant') && typeof candidate.content === 'string';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeToolUsage(value: unknown): ChatToolUsage | null {
  if (!isRecord(value)) return null;
  const rawName = value.toolName || value.name || value.tool || value.type;
  if (typeof rawName !== 'string' || !rawName.trim()) return null;
  return {
    toolName: rawName,
    input: value.input ?? value.args ?? value.arguments,
    output: value.output ?? value.result ?? value.data,
    citation: typeof value.citation === 'string' ? value.citation : undefined,
  };
}

function extractStreamDetails(payload: unknown): Pick<ChatMessage, 'reasoning' | 'toolUsages'> {
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

  return {
    reasoning: reasoningParts.join('\n\n') || undefined,
    toolUsages: toolUsages.length > 0 ? toolUsages : undefined,
  };
}

export function ChatContainer({ initialConversationId = null }: ChatContainerProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { activeArtifact, setIsOpen } = useArtifactStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageSequenceRef = useRef(0);
  const userStoppedRef = useRef(false);

  useEffect(() => {
    if (conversationId && user) {
      loadMessages(conversationId);
    }
  }, [conversationId, user]);

  const loadMessages = useCallback(
    async (convId: string) => {
      if (!user) return;

      setIsLoadingMessages(true);
      try {
        const token = await user.getIdToken();
        const API_URL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;

        const response = await fetch(`${API_URL}/api/conversations/${convId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load conversation');
        }

        const data: { messages?: unknown[] } = await response.json();
        const loadedMessages: ChatMessage[] = (data.messages || []).filter(isApiChatMessage).map((msg, index) => {
          const metadata = isRecord(msg.metadata) ? (msg.metadata as ChatMessageMetadata) : undefined;
          return {
            role: msg.role,
            content: msg.content,
            id: msg.id || `${msg.role}-loaded-${index}`,
            reasoning: typeof msg.reasoning === 'string' ? msg.reasoning : typeof metadata?.reasoning === 'string' ? metadata.reasoning : undefined,
            toolUsages: Array.isArray(msg.toolUsages) ? msg.toolUsages : Array.isArray(metadata?.toolUsages) ? metadata.toolUsages : undefined,
            metadata,
          };
        });

        setMessages(loadedMessages);
      } catch (error: unknown) {
        console.error('Error loading messages:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load conversation messages.' });
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [user, toast]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processStream = useCallback(
    async (response: Response, isNewConversation: boolean) => {
      if (!response.body) {
        throw new Error('No response body');
      }

      if (isNewConversation) {
        const conversationIdHeader = response.headers.get('X-Conversation-Id');
        if (conversationIdHeader) {
          setConversationId(conversationIdHeader);
          router.replace(`/chat/${conversationIdHeader}`, { scroll: false });
        }
      }

      const assistantId = `assistant-${Date.now()}-${messageSequenceRef.current++}`;
      let assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        id: assistantId,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        await consumeChatStream(response, {
          onTextDelta: (textContent) => {
            if (!textContent) return;

            assistantMessage.content += textContent;
            setMessages((prev) => {
              const updated = [...prev];
              const messageIndex = updated.findIndex((msg) => msg.id === assistantId);
              if (messageIndex >= 0) updated[messageIndex] = { ...assistantMessage };
              return updated;
            });
          },
          onData: (payload) => {
            const details = extractStreamDetails(payload);
            if (!details.reasoning && !details.toolUsages?.length) return;

            assistantMessage = {
              ...assistantMessage,
              reasoning: [assistantMessage.reasoning, details.reasoning].filter(Boolean).join('\n\n') || undefined,
              toolUsages: [...(assistantMessage.toolUsages || []), ...(details.toolUsages || [])],
            };
            setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? { ...assistantMessage } : msg)));
          },
          onParseError: (parseError, line) => {
            console.warn('Failed to parse stream line:', parseError, line);
          },
        });

        setMessages((prev) => {
          const updated = [...prev];
          const messageIndex = updated.findIndex((msg) => msg.id === assistantId);
          if (messageIndex >= 0) updated[messageIndex] = { ...assistantMessage };
          return updated;
        });
      } catch (streamError: unknown) {
        if (!(streamError instanceof DOMException && streamError.name === 'AbortError')) {
          console.error('Stream processing error:', streamError);
          toast({ variant: 'destructive', title: 'Stream Error', description: 'Failed to process streaming response.' });
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
        userStoppedRef.current = false;
      }
    },
    [router, toast]
  );

  const handleSubmit = useCallback(
    async (content: string, options: { appendUserMessage?: boolean; replaceLastAssistant?: boolean } = {}) => {
      if (!user || !content.trim() || isStreaming) return;

      const shouldAppendUserMessage = options.appendUserMessage !== false;
      const userMessage: ChatMessage = { role: 'user', content: content.trim(), id: `user-${Date.now()}-${messageSequenceRef.current++}` };

      setMessages((prev) => {
        const next = options.replaceLastAssistant && prev[prev.length - 1]?.role === 'assistant' ? prev.slice(0, -1) : prev;
        return shouldAppendUserMessage ? [...next, userMessage] : next;
      });
      setIsStreaming(true);

      if (abortControllerRef.current) abortControllerRef.current.abort();

      userStoppedRef.current = false;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const token = await user.getIdToken();
        const API_URL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
        const isNewConversation = conversationId === null;

        const response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversationId,
            message: content.trim(),
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to send message';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        await processStream(response, isNewConversation);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          if (shouldAppendUserMessage && !userStoppedRef.current) setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
          userStoppedRef.current = false;
          setIsStreaming(false);
          abortControllerRef.current = null;
          return;
        }

        console.error('Chat error:', error);
        toast({ variant: 'destructive', title: 'Error', description: getErrorMessage(error, 'Failed to send message. Please try again.') });
        if (shouldAppendUserMessage) setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
        setIsStreaming(false);
      }
    },
    [user, conversationId, isStreaming, processStream, toast]
  );

  const handleStop = useCallback(() => {
    userStoppedRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const handleRegenerate = useCallback(() => {
    if (isStreaming) return;
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (!lastUserMessage?.content.trim()) return;
    void handleSubmit(lastUserMessage.content, { appendUserMessage: false, replaceLastAssistant: true });
  }, [handleSubmit, isStreaming, messages]);

  if (isLoadingMessages) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading conversation
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <div className="shrink-0 border-b border-border bg-background px-3 py-3 md:px-6">
        <div className="mx-auto flex w-full max-w-content-reading items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="truncate font-medium text-foreground">{conversationId ? 'Chat' : 'New chat'}</span>
          </div>
          <div className="flex items-center gap-2">
            {isStreaming && <span className="hidden text-xs text-muted-foreground sm:inline">Streaming…</span>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isStreaming || !messages.some((message) => message.role === 'user')}
              onClick={handleRegenerate}
              className="gap-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Regenerate</span>
            </Button>
            {isStreaming && (
              <Button type="button" variant="destructive" size="sm" onClick={handleStop} className="gap-1.5">
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Stop</span>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Sources and context"
              aria-label="Sources and context"
              disabled={!activeArtifact}
              onClick={() => setIsOpen(true)}
              className="gap-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Sources</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="app-scroll flex-1 overflow-y-auto bg-background">
        <MessageList messages={messages} onExampleSelect={(prompt) => handleSubmit(prompt)} examplesDisabled={isStreaming} onRegenerate={handleRegenerate} isRegenerating={isStreaming} />
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 shrink-0 border-t border-border bg-background">
        <ChatInput onSubmit={(message) => handleSubmit(message)} onStop={handleStop} disabled={isStreaming} isLoading={isStreaming} />
      </div>
    </div>
  );
}
