'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '@/lib/auth/AuthContext';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

interface ChatWindowProps {
  threadId: string;
  agentId?: 'builder' | 'universe';
}

/**
 * Main ChatWindow component that orchestrates the entire chat experience
 */
export function ChatWindow({ threadId, agentId = 'universe' }: ChatWindowProps) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Process streaming response from the API
   */
  const processStream = async (response: Response) => {
    if (!response.body) {
      throw new Error('No response body');
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
              // Content is typically a JSON-encoded string
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
                // For now, we just log them for debugging
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
    } catch (error) {
      console.error('Stream processing error:', error);
      throw error;
    }
  };

  /**
   * Handle message submission
   */
  const handleSubmit = async (content: string) => {
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

      // Build conversation history for the API
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call streaming API
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: content.trim(),
          agentId,
          threadId,
          history,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to send message');
      }

      // Process the streaming response
      await processStream(response);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User cancelled - remove the assistant message placeholder
        setMessages((prev) => prev.filter((msg) => msg.id !== `assistant-${Date.now()}`));
        return;
      }

      console.error('Chat error:', error);
      
      // Remove assistant message placeholder on error
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.role === 'assistant' && !updated[updated.length - 1].content) {
          updated.pop();
        }
        return updated;
      });

      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send message. Please try again.',
      });
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Show loading state if user is not available
  if (!user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
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
      <div className="border-t border-border bg-background p-4">
        <ChatInput
          onSubmit={handleSubmit}
          disabled={isStreaming}
          isLoading={isStreaming}
        />
      </div>
    </div>
  );
}

