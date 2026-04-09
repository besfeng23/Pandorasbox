'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

interface ChatContainerProps {
  initialConversationId?: string | null;
}

export function ChatContainer({ initialConversationId = null }: ChatContainerProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
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

        const data = await response.json();
        const loadedMessages: ChatMessage[] = (data.messages || []).map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          id: msg.id,
        }));

        setMessages(loadedMessages);
      } catch (error: any) {
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        id: `assistant-${Date.now()}`,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) continue;

            const type = line.substring(0, colonIndex);
            const content = line.substring(colonIndex + 1);

            try {
              if (type === '0') {
                let textContent = '';

                try {
                  const parsed = JSON.parse(content);
                  if (typeof parsed === 'string') textContent = parsed;
                  else if (parsed && typeof parsed === 'object') textContent = parsed.text || parsed.content || '';
                  else textContent = String(parsed);
                } catch {
                  textContent = content.replace(/^"|"$/g, '');
                }

                if (textContent) {
                  assistantMessage.content += textContent;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') updated[lastIndex] = { ...assistantMessage };
                    return updated;
                  });
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse stream line:', parseError, line);
            }
          }
        }

        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') updated[lastIndex] = { ...assistantMessage };
          return updated;
        });
      } catch (streamError: any) {
        if (streamError.name !== 'AbortError') {
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
      } catch (error: any) {
        if (error.name === 'AbortError') {
          setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
          return;
        }

        console.error('Chat error:', error);
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to send message. Please try again.' });
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
        setIsStreaming(false);
      }
    },
    [user, conversationId, isStreaming, processStream, toast]
  );

  if (isLoadingMessages) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading conversation
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/70 bg-background/70 px-3 py-2 backdrop-blur md:px-6">
        <div className="mx-auto flex w-full max-w-content-reading items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>{conversationId ? 'Conversation' : 'New conversation'}</span>
          </div>
          {isStreaming && <span className="text-xs text-muted-foreground">Streaming response…</span>}
        </div>
      </div>

      <div className="app-scroll flex-1 overflow-y-auto">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <ChatInput onSubmit={handleSubmit} disabled={isStreaming} isLoading={isStreaming} />
      </div>
    </div>
  );
}
