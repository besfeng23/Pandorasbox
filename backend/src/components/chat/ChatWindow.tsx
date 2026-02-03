'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { type Message as MessageType, type ToolUsage } from '@/lib/types';
import { MessageList } from './MessageList';
import { FloatingComposer } from './floating-composer';
import { FollowUpChips, generateFollowUpSuggestions } from './follow-up-chips';
import { InspectorDrawer, useInspectorDrawer } from '@/components/dashboard/inspector-drawer';
import { Button } from '@/components/ui/button';
import { Loader2, Bot, BrainCircuit, PanelRightOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVoice } from '@/hooks/use-voice';
import { transcribeAndProcessMessage, getMessages, summarizeThread, getThread } from '@/app/actions';

export interface ChatMessage extends Partial<MessageType> {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
  attachments?: { url: string; type: string }[];
  toolUsages?: ToolUsage[];
}

interface ChatWindowProps {
  threadId: string;
  agentId?: 'builder' | 'universe';
}

/**
 * Main ChatWindow component that orchestrates the entire chat experience
 */
export function ChatWindow({ threadId, agentId = 'universe' }: ChatWindowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inspector = useInspectorDrawer();
  const { speak } = useVoice();


  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      if (!user || !threadId) return;

      setIsLoading(true);
      try {
        const history = await getMessages(threadId, user.uid);
        if (history && history.length > 0) {
          setMessages(history.map(msg => ({
            ...msg,
            role: msg.role as 'user' | 'assistant' | 'system',
            createdAt: typeof msg.createdAt === 'object' ? msg.createdAt.toISOString?.() || new Date().toISOString() : msg.createdAt
          })));
        }
      } catch (error) {
        console.error('Failed to load history:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load chat history.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [threadId, user?.uid]);

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
              try {
                const data = JSON.parse(content);

                // Detection for Artifacts
                if (Array.isArray(data)) {
                  for (const item of data) {
                    if (item.toolCall) {
                      setMessages((prev) => {
                        const updated = [...prev];
                        const lastIndex = updated.length - 1;
                        if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                          const usages = updated[lastIndex].toolUsages || [];
                          // Avoid duplicates
                          if (!usages.some(u => u.toolName === item.toolCall.toolName && JSON.stringify(u.input) === JSON.stringify(item.toolCall.args))) {
                            updated[lastIndex] = {
                              ...updated[lastIndex],
                              toolUsages: [...usages, {
                                toolName: item.toolCall.toolName,
                                input: item.toolCall.args,
                                output: null
                              }]
                            };
                          }
                        }
                        return updated;
                      });
                    }
                    if (item.toolResult) {
                      setMessages((prev) => {
                        const updated = [...prev];
                        const lastIndex = updated.length - 1;
                        if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                          const usages = [...(updated[lastIndex].toolUsages || [])];
                          const usageIndex = usages.findIndex(u => u.toolName === item.toolResult.toolName && !u.output);

                          if (usageIndex !== -1) {
                            usages[usageIndex] = {
                              ...usages[usageIndex],
                              output: item.toolResult.result
                            };
                            updated[lastIndex] = {
                              ...updated[lastIndex],
                              toolUsages: usages
                            };
                          }
                        }
                        return updated;
                      });
                    }
                  }
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
  const handleSubmit = async (content: string | FormData, attachments?: { url: string; type: string }[]) => {
    if (!user || isStreaming) {
      return;
    }

    let messageText = '';
    let voiceFormData: FormData | null = null;

    if (content instanceof FormData) {
      voiceFormData = content;
      setIsStreaming(true); // Show loading while transcribing
      const transcriptionResult = await transcribeAndProcessMessage(voiceFormData);
      if (transcriptionResult.success && transcriptionResult.text) {
        messageText = transcriptionResult.text;
      } else {
        toast({
          variant: 'destructive',
          title: 'Transcription Failed',
          description: transcriptionResult.message || 'Could not convert voice to text.',
        });
        setIsStreaming(false);
        return;
      }
    } else {
      if (!content.trim() && (!attachments || attachments.length === 0)) return;
      messageText = content.trim();
    }

    // Add user message immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText,
      id: `user-${Date.now()}`,
      attachments: attachments,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setFollowUpSuggestions([]); // Clear previous suggestions

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Get auth token
      const token = await user.getIdToken();
      // Build conversation history for the API
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call streaming API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageText,
          agentId,
          threadId,
          history,
          attachments, // Send attachments to API
          workspaceId: localStorage.getItem('activeWorkspaceId') || null,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send message';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, try to get text
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Check if response has a body (streaming)
      if (!response.body) {
        throw new Error('No response body received. The inference server may be offline.');
      }

      // Process the streaming response
      await processStream(response);

      // Generate follow-up suggestions after successful response
      const suggestions = generateFollowUpSuggestions(messageText, agentId);
      setFollowUpSuggestions(suggestions);

      // Auto-summarize if this is the first exchange
      if (messages.length <= 2) {
        try {
          const thread = await getThread(threadId, user.uid);
          if (thread && (thread.name === "New Thread" || !thread.name)) {
            console.log('[ChatWindow] Triggering auto-summary for thread:', threadId);
            await summarizeThread(threadId, user.uid);
          }
        } catch (e) {
          console.error('Auto-summary failed:', e);
        }
      }
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

      // Extract error message from response if available
      let errorMessage = error.message || 'Failed to send message. Please try again.';
      try {
        if (error.message && error.message.includes('{')) {
          const errorData = JSON.parse(error.message);
          errorMessage = errorData.error || errorMessage;
        }
      } catch {
        // If parsing fails, use the original message
      }

      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
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
    <div className="flex h-full flex-col bg-background relative">
      {/* Header Info - Minimal */}
      <div className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="h-auto p-0 hover:bg-transparent font-semibold text-lg flex items-center gap-1">
            {agentId === 'builder' ? 'Builder' : 'Universe'} <Bot className="h-4 w-4 ml-1 opacity-50" />
          </Button>
          <span className="bg-primary/5 text-primary text-[10px] px-2 py-0.5 rounded-full font-medium">Plus</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => inspector.open(threadId)}
            title="Open Inspector"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* MessageList Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth w-full max-w-3xl mx-auto px-4 pb-32">
        <MessageList
          messages={messages as MessageType[]}
          onSpeak={(content: string) => speak(content)}
        />
        {/* Follow-up Suggestions at bottom of chat */}
        {followUpSuggestions.length > 0 && (
          <div className="py-4">
            <FollowUpChips
              suggestions={followUpSuggestions}
              onSelect={(suggestion) => handleSubmit(suggestion)}
              isLoading={isStreaming}
            />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Chat Input */}
      <FloatingComposer
        userId={user.uid}
        onSubmit={handleSubmit}
        disabled={isStreaming}
        isLoading={isStreaming}
      />

      {/* Inspector Drawer */}
      <InspectorDrawer
        open={inspector.isOpen}
        onClose={inspector.close}
        threadId={threadId}
        sources={messages
          .flatMap(m => m.toolUsages || [])
          .filter(t => t.toolName === 'Memory Recall')
          .flatMap(t => Array.isArray(t.output) ? t.output : [])
          .reverse() // Show newest first? Or oldest? Usually most relevant first.
        }
      />
    </div>
  );
}

