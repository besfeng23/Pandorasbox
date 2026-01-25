
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
import { Message } from './message';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { PandoraBoxIcon } from '@/components/icons';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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
  const [isToolActive, setIsToolActive] = useState(false); // New state for tool indicator
  const [activeToolName, setActiveToolName] = useState(''); // New state for active tool name
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

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
                toast({
                    variant: 'destructive',
                    title: 'Access Denied',
                    description: "You don't have permission to view this thread or it doesn't exist.",
                });
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

    setStreamingMessage({
        id: 'assistant-streaming',
        role: 'assistant',
        content: '',
        createdAt: new Date() as any, // Temp value
        history: [],
    });

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // Check for experimental_streamData
        if (chunk.startsWith('0: ')) {
          const data = JSON.parse(chunk.substring(3)); // Remove '0: ' prefix
          if (data.type === 'tool_start') {
            setIsToolActive(true);
            setActiveToolName(data.display || data.toolName);
          } else if (data.type === 'tool_end') {
            setIsToolActive(false);
            setActiveToolName('');
            if (data.status === 'error') {
              toast({
                variant: 'destructive',
                title: `Tool Error: ${data.toolName}`,
                description: data.error || 'An error occurred while using the tool.',
              });
            }
          }
        } else {
          setStreamingMessage(prev => ({ ...prev!, content: prev!.content + chunk }));
        }
    }

    setStreamingMessage(null); // Stream finished
    // Refresh messages from backend
    if (user) {
        const updatedMessages = await getMessages(threadId, user.uid);
        setMessages(updatedMessages);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !thread) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in and in a valid thread to send a message.',
      });
      return;
    }
    setIsSending(true);
    form.reset();

    try {
      const token = await user.getIdToken();
      const agentId = thread.agent;
      const messagePayload: any = {
        message: values.content,
        threadId: thread.id,
        agentId,
      };
      
      // Abort previous request if any
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
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
      setStreamingMessage(null);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send message. Please try again.',
      });
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

        if (!lastUserMessage) {
            throw new Error('No user message to regenerate from.');
        }
        
        if (lastAssistantMessage) {
            await deleteMessage(threadId, lastAssistantMessage.id, user.uid);
            // Update local state immediately
            setMessages(prev => prev.filter(m => m.id !== lastAssistantMessage.id));
        }

        const token = await user.getIdToken();
        const agentId = thread.agent;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: lastUserMessage.content,
                threadId: thread.id,
                agentId: agentId,
            })
        });

        if (!response.ok) {
            throw new Error((await response.text()) || 'Failed to regenerate response.');
        }

        if (response.body) {
            await handleStream(response);
        }

    } catch (error: any) {
        setStreamingMessage(null);
        toast({
            variant: 'destructive',
            title: 'Error Regenerating',
            description: error.message || 'Could not regenerate response.',
        });
    } finally {
        setIsRegenerating(false);
    }
  };

  const handleExtractMemories = async () => {
    if (!user || !thread || isExtracting || messages.length === 0) return;

    setIsExtracting(true);
    toast({ title: 'Extracting memories...', description: 'Your agent is reviewing the conversation.' });

    try {
        const conversationText = messages
            .map(m => `${m.role}: ${m.content}`)
            .join('\n\n');
        
        const token = await user.getIdToken();

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/memory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ conversation: conversationText, threadId: thread.id })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to extract memories.');
        }

        const result = await response.json();

        if (result.count > 0) {
            toast({
                title: 'Memories Learned',
                description: `${result.count} new memories were saved.`,
            });
        } else {
            toast({
                title: 'No new memories found',
                description: 'The agent did not find any new key information to save.',
            });
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Memory Extraction Failed',
            description: error.message || 'Could not extract memories from this conversation.',
        });
    } finally {
        setIsExtracting(false);
    }
  }


  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="border-b bg-card p-4 flex justify-between items-center">
        <h2 className="font-headline text-lg font-semibold">{thread?.name || 'Chat'}</h2>
        {thread && (
            <Button onClick={handleExtractMemories} disabled={isExtracting || messages.length === 0} variant="outline" size="sm">
                {isExtracting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <BrainCircuit className="mr-2 h-4 w-4" />
                )}
                Learn from Conversation
            </Button>
        )}
      </header>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 && !streamingMessage ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            {thread ? (
              <>
                <div className="mb-4 rounded-full border bg-background p-4 shadow-sm">
                  {thread.agent === 'builder' ? <Bot className="h-10 w-10 text-primary" /> : <BrainCircuit className="h-10 w-10 text-primary" />}
                </div>
                <h3 className="text-xl font-semibold">
                  {thread.name}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  This is the beginning of your conversation with the {thread.agent} agent.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Send a message to get started.
                </p>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 rounded-full border bg-background p-4 shadow-sm">
                      <PandoraBoxIcon className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">
                      Welcome to Pandora's Box
                  </h3>
                  <p className="mt-2 max-w-md text-muted-foreground">
                      Select a conversation from the sidebar, or create a new thread with the Builder or Universe agent to get started.
                  </p>
              </div>
            )}
          </div>
        ) : (
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
                className="flex items-center space-x-2 text-sm text-muted-foreground"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{activeToolName || 'AI is thinking...'}</span>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
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
                      disabled={!thread || isSending || isRegenerating || isToolActive}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {isSending || isRegenerating || isToolActive ? (
              <Button variant="outline" size="icon" disabled>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="sr-only">Generating...</span>
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!thread || isToolActive}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            )}
          </form>
        </Form>
        {(isSending || isRegenerating) && (
          <div className="mt-2 flex justify-center">
              <Button variant="destructive" size="sm" onClick={handleStop}>
                  <Square className="mr-2 h-3 w-3" /> Stop generating
                  <span className="sr-only">Stop generating</span>
              </Button>
          </div>
        )}
      </div>
    </div>
  );
}
 