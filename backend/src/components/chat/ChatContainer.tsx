'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useArtifactStore } from '@/store/artifacts';
import { consumeChatStream } from './stream-utils';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

interface ChatContainerProps {
  initialConversationId?: string | null;
}

type ApiChatMessage = {
  role: ChatMessage['role'];
  content: string;
  id?: string;
};

function isApiChatMessage(message: unknown): message is ApiChatMessage {
  if (!message || typeof message !== 'object') return false;
  const candidate = message as Partial<ApiChatMessage>;
  return (candidate.role === 'user' || candidate.role === 'assistant') && typeof candidate.content === 'string';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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
        const loadedMessages: ChatMessage[] = (data.messages || []).filter(isApiChatMessage).map((msg) => ({
          role: msg.role,
          content: msg.content,
          id: msg.id,
        }));

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

      let assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        id: `assistant-${Date.now()}`,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        await consumeChatStream(response, {
          onTextDelta: (textContent) => {
            if (!textContent) return;

            assistantMessage.content += textContent;
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') updated[lastIndex] = { ...assistantMessage };
              return updated;
            });
          },
          onParseError: (parseError, line) => {
            console.warn('Failed to parse stream line:', parseError, line);
          },
        });

        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') updated[lastIndex] = { ...assistantMessage };
          return updated;
        });
      } catch (streamError: unknown) {
        if (!(streamError instanceof DOMException && streamError.name === 'AbortError')) {
          console.error('Stream processing error:', streamError);
          toast({ variant: 'destructive', title: 'Stream Error', description: 'Failed to process streaming response.' });
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [router, toast]
  );

  const handleSubmit = useCallback(
    async (content: string) => {
      if (!user || !content.trim() || isStreaming) return;

      const userMessage: ChatMessage = { role: 'user', content: content.trim(), id: `user-${Date.now()}` };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      if (abortControllerRef.current) abortControllerRef.current.abort();

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
          setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
          return;
        }

        console.error('Chat error:', error);
        toast({ variant: 'destructive', title: 'Error', description: getErrorMessage(error, 'Failed to send message. Please try again.') });
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
        setIsStreaming(false);
      }
    },
    [user, conversationId, isStreaming, processStream, toast]
  );

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
        <MessageList messages={messages} onExampleSelect={handleSubmit} examplesDisabled={isStreaming} />
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 shrink-0 border-t border-border bg-background">
        <ChatInput onSubmit={handleSubmit} disabled={isStreaming} isLoading={isStreaming} />
      </div>
    </div>
  );
}
