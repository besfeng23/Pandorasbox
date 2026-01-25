'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthContext } from '@/lib/auth/AuthContext';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Loader2 } from 'lucide-react';
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

/**
 * ChatContainer component responsible for state management and streaming logic
 * Handles conversation creation, message streaming, and conversationId capture
 */
export function ChatContainer({ initialConversationId = null }: ChatContainerProps = {}) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing messages if conversationId is provided
  useEffect(() => {
    if (conversationId && user) {
      loadMessages(conversationId);
    }
  }, [conversationId, user]);

  /**
   * Load existing messages from the conversation
   */
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
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load conversation messages.',
        });
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [user, toast]
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Process streaming response from the API
   * Captures conversationId from response headers on first message
   */
  const processStream = useCallback(
    async (response: Response, isNewConversation: boolean) => {
      if (!response.body) {
        throw new Error('No response body');
      }

      // Capture conversationId from headers if this is a new conversation
      if (isNewConversation) {
        const conversationIdHeader = response.headers.get('X-Conversation-Id');
        if (conversationIdHeader) {
          setConversationId(conversationIdHeader);
          // Update URL to include conversationId for better UX
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

      // Add assistant message placeholder immediately
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the chunk
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          // Vercel AI SDK format: "0:content" or "2:[data]"
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;

            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) continue;

            const type = line.substring(0, colonIndex);
            const content = line.substring(colonIndex + 1);

            try {
              if (type === '0') {
                // Text content - Vercel AI SDK format
                let textContent = '';

                try {
                  // Try to parse as JSON first (most common case)
                  const parsed = JSON.parse(content);
                  if (typeof parsed === 'string') {
                    textContent = parsed;
                  } else if (parsed && typeof parsed === 'object') {
                    // Handle object with text/content property
                    textContent = parsed.text || parsed.content || '';
                  } else {
                    textContent = String(parsed);
                  }
                } catch {
                  // If not JSON, treat content as plain text
                  // Remove quotes if present (from JSON encoding)
                  textContent = content.replace(/^"|"$/g, '');
                }

                if (textContent) {
                  assistantMessage.content += textContent;

                  // Update the assistant message in real-time
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                      updated[lastIndex] = { ...assistantMessage };
                    }
                    return updated;
                  });
                }
              } else if (type === '2') {
                // StreamData - tool calls and metadata
                // We can ignore these for now or handle them later
                try {
                  const data = JSON.parse(content);
                  // Handle tool calls if needed in the future
                  if (process.env.NODE_ENV === 'development') {
                    console.log('StreamData:', data);
                  }
                } catch {
                  // Ignore malformed data
                }
              }
            } catch (parseError) {
              // Skip malformed lines
              console.warn('Failed to parse stream line:', parseError, line);
            }
          }
        }

        // Final update to ensure all content is captured
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
            updated[lastIndex] = { ...assistantMessage };
          }
          return updated;
        });
      } catch (streamError: any) {
        if (streamError.name !== 'AbortError') {
          console.error('Stream processing error:', streamError);
          toast({
            variant: 'destructive',
            title: 'Stream Error',
            description: 'Failed to process streaming response.',
          });
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [router, toast]
  );

  /**
   * Handle message submission
   * Sends custom payload: { conversationId: string | null, userMessage: string }
   */
  const handleSubmit = useCallback(
    async (content: string) => {
      if (!user || !content.trim() || isStreaming) {
        return;
      }

      // Add user message immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: content.trim(),
        id: `user-${Date.now()}`,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // Get auth token
        const token = await user.getIdToken();
        const API_URL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;

        // Determine if this is a new conversation
        const isNewConversation = conversationId === null;

        // Call streaming API with custom payload format
        const response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversationId: conversationId,
            userMessage: content.trim(),
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

        // Process the streaming response
        await processStream(response, isNewConversation);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          // Request was cancelled, remove the user message
          setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
          return;
        }

        console.error('Chat error:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to send message. Please try again.',
        });

        // Remove user message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
        setIsStreaming(false);
      }
    },
    [user, conversationId, isStreaming, processStream, toast]
  );

  if (isLoadingMessages) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <ChatInput onSubmit={handleSubmit} disabled={isStreaming} />
      </div>
    </div>
  );
}

