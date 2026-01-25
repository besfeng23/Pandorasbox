
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getThread, getMessages, deleteMessage } from '@/app/actions';
import { Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { Message as MessageType, Thread } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Loader2, Send, Square, Bot, BrainCircuit } from 'lucide-react';
import { WelcomeScreen } from './welcome-screen';
import { Message } from './message';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { PandoraBoxIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { ThinkingIndicator } from './thinking-indicator';

const formSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty.'),
});

export function ChatPanel({ threadId }: { threadId: string }) {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<MessageType | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isToolActive, setIsToolActive] = useState(false);
  const [thinkingLogs, setThinkingLogs] = useState<string[]>([]);
  const [toolStartTime, setToolStartTime] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: '' },
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setThread(null);
      setMessages([]);
      return;
    }

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [threadData, messagesData] = await Promise.all([
                getThread(threadId, user.uid),
                getMessages(threadId, user.uid)
            ]);

            if (threadData) {
                setThread(threadData);
                setMessages(messagesData);
            } else {
                setThread(null);
                setMessages([]);
            }
        } catch (error) {
            console.error('Error fetching chat data:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not load chat conversation.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [threadId, user, toast]);

  const handleStop = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsSending(false);
        setIsRegenerating(false);
        setStreamingMessage(null);
        toast({ title: 'Generation stopped' });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const handleStream = async (response: Response) => {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    setStreamingMessage({
        id: 'assistant-streaming',
        role: 'assistant',
        content: '',
        createdAt: new Date() as any,
        history: [],
    });
    
    setThinkingLogs([]);

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last partial line in the buffer

        for (const line of lines) {
            if (!line.trim()) continue;
            
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) continue;
            
            const type = line.substring(0, colonIndex);
            const content = line.substring(colonIndex + 1);
            
            try {
                const data = JSON.parse(content);
                
                if (type === '0') { // Text
                    setStreamingMessage(prev => ({ 
                        ...prev!, 
                        content: prev!.content + data 
                    }));
                } else if (type === '2') { // Data from StreamData
                    if (Array.isArray(data)) {
                        for (const item of data) {
                            if (item.type === 'tool_start') {
                                setIsToolActive(true);
                                setToolStartTime(new Date());
                                setThinkingLogs(prev => [...prev, item.display || `Executing ${item.toolName}...`]);
                            } else if (item.type === 'tool_end') {
                                // We keep the log but maybe update status?
                                // For now just clear tool active state after a short delay or when next tool starts
                                if (item.status === 'error') {
                                    setThinkingLogs(prev => [...prev, `Error: ${item.error || 'Unknown error'}`]);
                                }
                                // We don't necessarily want to hide the logs immediately
                            }
                        }
                    }
                }
            } catch (e) {
                // Not JSON or partial chunk, ignore for now
                console.warn('Failed to parse line:', line, e);
            }
        }
    }

    // Final buffer check
    if (buffer.trim()) {
        const colonIndex = buffer.indexOf(':');
        if (colonIndex !== -1) {
            const type = buffer.substring(0, colonIndex);
            const content = buffer.substring(colonIndex + 1);
            try {
                const data = JSON.parse(content);
                if (type === '0') {
                    setStreamingMessage(prev => ({ ...prev!, content: prev!.content + data }));
                }
            } catch (e) {}
        }
    }

    // After stream ends, wait a bit then hide tool indicator if it's still there
    setTimeout(() => {
        setIsToolActive(false);
    }, 1000);

    setStreamingMessage(null);
    if (user) {
        const updatedMessages = await getMessages(threadId, user.uid);
        setMessages(updatedMessages);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !thread) return;
    setIsSending(true);
    form.reset();

    try {
      const token = await user.getIdToken();
      const agentId = thread.agent;
      const messagePayload = {
        message: values.content,
        threadId: thread.id,
        agentId,
      };
      
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Use window.location.origin for relative API calls if NEXT_PUBLIC_API_URL is not explicitly set
      const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

      const response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(messagePayload),
          signal: abortController.signal
      });

      if (!response.ok) {
          throw new Error((await response.text()) || 'Failed to send message.');
      }

      if (response.body) {
        await handleStream(response);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const isOffline = error.message?.includes('fetch') || error.message?.includes('Network');
        toast({
          variant: 'destructive',
          title: isOffline ? 'AI is Asleep' : 'Error',
          description: isOffline 
            ? 'The Sovereign Brain is currently unreachable. Check your container status.' 
            : (error.message || 'Failed to send message.'),
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleRegenerate = async () => {
    if (!user || !thread || isRegenerating || isSending) return;

    setIsRegenerating(true);
    try {
        const lastUserMessage = [...messages].filter(m => m.role === 'user').pop();
        const lastAssistantMessage = [...messages].filter(m => m.role === 'assistant').pop();

        if (!lastUserMessage) throw new Error('No user message to regenerate from.');
        
        if (lastAssistantMessage) {
            await deleteMessage(threadId, lastAssistantMessage.id, user.uid);
            setMessages(prev => prev.filter(m => m.id !== lastAssistantMessage.id));
        }

        const token = await user.getIdToken();
        
        // Use window.location.origin for relative API calls if NEXT_PUBLIC_API_URL is not explicitly set
        const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: lastUserMessage.content,
                threadId: thread.id,
                agentId: thread.agent,
            })
        });

        if (!response.ok) throw new Error('Failed to regenerate response.');
        if (response.body) await handleStream(response);

    } catch (error: any) {
        const isOffline = error.message?.includes('fetch') || error.message?.includes('Network');
        toast({
            variant: 'destructive',
            title: isOffline ? 'AI is Asleep' : 'Error Regenerating',
            description: isOffline 
                ? 'The Sovereign Brain is currently unreachable. Check your container status.' 
                : (error.message || 'Could not regenerate response.'),
        });
    } finally {
        setIsRegenerating(false);
    }
  };

  const handleExtractMemories = async () => {
    if (!user || !thread || isExtracting || messages.length === 0) return;
    setIsExtracting(true);
    try {
        const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        const token = await user.getIdToken();

        // Use window.location.origin for relative API calls if NEXT_PUBLIC_API_URL is not explicitly set
        const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

        const response = await fetch(`${API_URL}/api/memory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ conversation: conversationText, threadId: thread.id })
        });
        if (!response.ok) throw new Error('Failed to extract memories.');
        const result = await response.json();
        toast({
            title: result.count > 0 ? 'Memories Learned' : 'No new memories',
            description: result.count > 0 ? `${result.count} new memories were saved.` : 'Agent did not find new information.',
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Memory Extraction Failed',
            description: error.message || 'Could not extract memories.',
        });
    } finally {
        setIsExtracting(false);
    }
  }

  if (isLoading && !messages.length) {
    return (
      <div className="flex flex-1 flex-col p-4 space-y-4">
        <Skeleton className="h-12 w-1/4" />
        <div className="flex-1 space-y-6">
          <Skeleton className="h-24 w-3/4 rounded-lg" />
          <Skeleton className="h-24 w-1/2 ml-auto rounded-lg" />
          <Skeleton className="h-32 w-2/3 rounded-lg" />
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!thread || (messages.length === 0 && !streamingMessage)) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b bg-card p-4">
          <h2 className="font-headline text-lg font-semibold">{thread?.name || 'New Thread'}</h2>
        </header>
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
          <WelcomeScreen onThreadCreated={(id) => threadId === id ? null : window.location.href = `/chat/${id}`} />
        </div>
        <div className="border-t bg-card p-4">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-4">
                <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                    <FormItem className="flex-1">
                    <FormControl>
                        <Textarea
                        placeholder="Type your first message..."
                        className="resize-none"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !isSending && !isRegenerating && !isToolActive) {
                            e.preventDefault();
                            form.handleSubmit(onSubmit)();
                            }
                        }}
                        {...field}
                        disabled={!thread || isSending || isRegenerating || isToolActive}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />
                <Button type="submit" size="icon" disabled={!thread || isSending || isRegenerating || isToolActive}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </form>
            </Form>
        </div>
      </div>
    );
  }

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="border-b bg-card p-4 flex justify-between items-center">
        <h2 className="font-headline text-lg font-semibold">{thread.name}</h2>
        <Button onClick={handleExtractMemories} disabled={isExtracting || messages.length === 0} variant="outline" size="sm">
            {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
            Learn from Conversation
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="space-y-6" role="log" aria-live="polite">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Message
                  message={message}
                  isLastAssistantMessage={message.id === lastMessage?.id && lastMessage?.role === 'assistant'}
                  onRegenerate={handleRegenerate}
                  isRegenerating={isRegenerating}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {streamingMessage && (
               <motion.div
                  key={streamingMessage.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
              >
                  <Message
                      message={streamingMessage}
                      isLastAssistantMessage={true}
                      onRegenerate={handleRegenerate}
                      isRegenerating={isRegenerating}
                  />
              </motion.div>
          )}
          {isToolActive && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-accent/20 p-3 rounded-lg border border-accent/30 max-w-md"
            >
              <ThinkingIndicator logs={thinkingLogs} createdAt={toolStartTime} />
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="border-t bg-card p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Textarea
                      placeholder={isSending || isRegenerating || isToolActive ? "Assistant is thinking..." : "Type your message here..."}
                      className="resize-none"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !isSending && !isRegenerating && !isToolActive) {
                          e.preventDefault();
                          form.handleSubmit(onSubmit)();
                        }
                      }}
                      {...field}
                      disabled={isSending || isRegenerating || isToolActive}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {isSending || isRegenerating || isToolActive ? (
              <Button variant="outline" size="icon" disabled>
                  <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            ) : (
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
        </Form>
        {(isSending || isRegenerating) && (
          <div className="mt-2 flex justify-center">
              <Button variant="destructive" size="sm" onClick={handleStop} className="h-7 text-xs">
                  <Square className="mr-2 h-3 w-3" /> Stop generating
              </Button>
          </div>
        )}
      </div>
    </div>
  );
}
