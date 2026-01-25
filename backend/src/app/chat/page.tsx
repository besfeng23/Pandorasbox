'use client';

import { useState, useRef, useEffect } from 'react';
import { type ChatMessage } from '@/lib/llm/llm-client';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';

/**
 * ChatPage component - Core chat interface with streaming support
 * Handles message state, streaming responses, and user input
 */
export default function ChatPage() {
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for stream management
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Handle sending a message and processing the streaming response
   * @param prompt The user's message/prompt
   */
  const handleSendMessage = async (prompt: string) => {
    if (!prompt.trim() || isStreaming) {
      return;
    }

    // Clear any previous errors
    setError(null);

    // 1. Add user message to state immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt.trim(),
    };

    // 2. Add pending assistant message
    const pendingAssistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, userMessage, pendingAssistantMessage]);
    setInput('');
    setIsStreaming(true);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // 3. Build history array (exclude the pending assistant message)
      const history: ChatMessage[] = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // 4. Initiate fetch request to /api/chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          history: history,
        }),
        signal: abortController.signal,
      });

      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Verify response has a body
      if (!response.body) {
        throw new Error('Response does not have a readable stream body');
      }

      // 5. Streaming Logic: Use response.body.getReader() and TextDecoder
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the chunk
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines (SSE format: "data: {content}\n\n")
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;

            // Handle SSE format: "data: {content}"
            if (line.startsWith('data: ')) {
              const data = line.slice(6); // Remove "data: " prefix

              try {
                // Try to parse as JSON (OpenAI-compatible format)
                const parsed = JSON.parse(data);
                
                // Handle different response formats
                let textContent = '';
                if (typeof parsed === 'string') {
                  textContent = parsed;
                } else if (parsed.choices?.[0]?.delta?.content) {
                  // OpenAI streaming format
                  textContent = parsed.choices[0].delta.content;
                } else if (parsed.content) {
                  textContent = parsed.content;
                } else if (parsed.text) {
                  textContent = parsed.text;
                }

                if (textContent) {
                  accumulatedContent += textContent;

                  // 6. Update the last assistant message content efficiently
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        content: accumulatedContent,
                      };
                    }
                    return updated;
                  });
                }
              } catch {
                // If not JSON, treat as plain text
                const textContent = data.trim();
                if (textContent) {
                  accumulatedContent += textContent;

                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        content: accumulatedContent,
                      };
                    }
                    return updated;
                  });
                }
              }
            } else if (line.trim()) {
              // Handle plain text chunks (non-SSE format)
              accumulatedContent += line;

              setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                  updated[lastIndex] = {
                    ...updated[lastIndex],
                    content: accumulatedContent,
                  };
                }
                return updated;
              });
            }
          }
        }
      } catch (streamError: any) {
        if (streamError.name === 'AbortError') {
          // Request was cancelled, remove the pending assistant message
          setMessages((prev) => prev.slice(0, -1));
          return;
        }
        throw streamError;
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    } catch (error: any) {
      // 7. Robust error handling
      if (error.name === 'AbortError') {
        // Request was cancelled, remove the pending assistant message
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      console.error('Chat API error:', error);

      // Remove the pending assistant message on error
      setMessages((prev) => prev.slice(0, -1));

      // Set error state for UI display
      const errorMessage =
        error.message || 'Failed to send message. Please check your connection and try again.';
      setError(errorMessage);

      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Message List - Scrollable area */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="border-t border-destructive bg-destructive/10 px-4 py-2">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-1 text-xs text-destructive/80 hover:text-destructive underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Chat Input - Fixed at bottom */}
      <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <ChatInput
          onSubmit={handleSendMessage}
          disabled={isStreaming}
          isLoading={isStreaming}
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
}
