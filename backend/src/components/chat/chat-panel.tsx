
'use client';

import { useState, useEffect, useRef } from 'react';
import { getThread, getMessages, deleteMessage } from '@/app/actions';
import { useUser } from '@/firebase';
import type { Message as MessageType, Thread } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Square, Volume2, VolumeX, BrainCircuit } from 'lucide-react';
import { useVoice } from '@/hooks/use-voice';
import { WelcomeScreen } from './welcome-screen';
import { Message } from './message';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { ThinkingIndicator } from './thinking-indicator';
import { ChatInput } from './chat-input';

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
  const [autoSpeak, setAutoSpeak] = useState(false);
  const { speak } = useVoice();

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
          setMessages(Array.isArray(messagesData) ? messagesData : []);
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
    let lastAssistantText = '';

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
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const type = line.substring(0, colonIndex);
        const content = line.substring(colonIndex + 1);

        try {
          const data = JSON.parse(content);

          if (type === '0') { // Text
            lastAssistantText += data;
            setStreamingMessage(prev => ({
              ...prev!,
              content: prev!.content + data
            }));
          } else if (type === '2') { // Data
            if (Array.isArray(data)) {
              for (const item of data) {
                if (item.type === 'tool_start') {
                  setIsToolActive(true);
                  setToolStartTime(new Date());
                  setThinkingLogs(prev => [...prev, item.display || `Executing ${item.toolName}...`]);
                } else if (item.type === 'tool_end') {
                  if (item.status === 'error') {
                    setThinkingLogs(prev => [...prev, `Error: ${item.error || 'Unknown error'}`]);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('Failed to parse line:', line);
        }
      }
    }

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
        } catch (e) { }
      }
    }

    setTimeout(() => setIsToolActive(false), 1000);
    setStreamingMessage(null);

    if (autoSpeak && lastAssistantText) {
      speak(lastAssistantText);
    }

    if (user) {
      const updatedMessages = await getMessages(threadId, user.uid);
      setMessages(updatedMessages);
    }
  };

  const onMessageSubmit = async (formData: FormData): Promise<boolean> => {
    if (!user || !thread) return false;

    // Prevent duplicate submissions
    if (isSending) return false;

    setIsSending(true);

    const message = formData.get('message') as string;
    const imageData = formData.get('image_data') as string;
    const audioFile = formData.get('audio_file') as File; // TODO: Handle audio upload/transcription if needed via separate API or here

    // Quick vision check
    const visionEnabled = localStorage.getItem('vision_enabled') === 'true' || !!imageData;

    try {
      const token = await user.getIdToken(true);
      const agentId = thread.agent;

      const payload: any = {
        message: message || (audioFile ? "Audio message" : ""), // Fallback
        threadId: thread.id,
        agentId,
        useVision: visionEnabled,
      };

      if (imageData) {
        payload.attachments = [{ type: 'image/base64', base64: imageData }];
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error((await response.text()) || 'Failed to send message.');
      }

      if (response.body) {
        await handleStream(response);
      }
      return true; // Success
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const isOffline = error.message?.includes('fetch') || error.message?.includes('Network');
        toast({
          variant: 'destructive',
          title: isOffline ? 'AI is Asleep' : 'Error',
          description: isOffline
            ? 'The Sovereign Brain is currently unreachable.'
            : (error.message || 'Failed to send message.'),
        });
      }
      return false; // Failed
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

      const token = await user.getIdToken(true);
      const visionEnabled = localStorage.getItem('vision_enabled') === 'true';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: lastUserMessage.content,
          threadId: thread.id,
          agentId: thread.agent,
          useVision: visionEnabled,
        })
      });

      if (!response.ok) throw new Error('Failed to regenerate response.');
      if (response.body) await handleStream(response);

    } catch (error: any) {
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
    try {
      const conversationText = (messages || []).map(m => `${m.role}: ${m.content}`).join('\n\n');
      const token = await user.getIdToken(true);

      const response = await fetch('/api/memory', {
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
          {user && (
            <ChatInput
              userId={user.uid}
              onMessageSubmit={onMessageSubmit}
              isSending={isSending || isRegenerating}
              onStop={handleStop}
            />
          )}
        </div>
      </div>
    );
  }

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="border-b bg-card p-4 flex justify-between items-center">
        <h2 className="font-headline text-lg font-semibold">{thread.name}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={cn("text-xs gap-2", autoSpeak ? "text-primary" : "text-muted-foreground")}
          >
            {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {autoSpeak ? "Auto-Speak ON" : "Auto-Speak OFF"}
          </Button>
          <Button onClick={handleExtractMemories} disabled={isExtracting || messages.length === 0} variant="outline" size="sm">
            {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
            Learn from Conversation
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        <div className="space-y-4 md:space-y-6" role="log" aria-live="polite">
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
                  onSpeak={() => speak(message.content)}
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
                onSpeak={() => speak(streamingMessage.content)}
              />
            </motion.div>
          )}
          {isSending && !streamingMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-muted-foreground text-sm italic ml-4 md:ml-12"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-0" />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-150" />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-300" />
              </div>
            </motion.div>
          )}
          {isToolActive && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-accent/20 p-3 rounded-lg border border-accent/30 max-w-full md:max-w-md"
            >
              <ThinkingIndicator logs={thinkingLogs} createdAt={toolStartTime} />
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="border-t bg-card p-4 safe-area-pb">
        {user && (
          <ChatInput
            userId={user.uid}
            onMessageSubmit={onMessageSubmit}
            isSending={isSending || isRegenerating}
            onStop={handleStop}
          />
        )}
        {(isSending || isRegenerating) && (
          <div className="mt-2 flex justify-center">
            {/* ChatInput handles stop button internally now */}
          </div>
        )}
      </div>
    </div>
  );
}
