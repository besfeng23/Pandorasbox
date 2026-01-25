'use client';

import { Message as MessageType, Thread } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Message } from './message';
import { FileText, Loader2 } from 'lucide-react';

interface ChatMessagesProps {
  messages: MessageType[];
  thread: Thread | null;
  userId: string;
  isLoading?: boolean;
  streamingContent?: string;
}

export function ChatMessages({ messages, thread, userId, isLoading, streamingContent }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const hasSummary = thread?.summary && thread.summary.length > 0;

  return (
    <div
      ref={scrollAreaRef}
      className="h-full w-full overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {messages.length === 0 && !hasSummary && !isLoading && !streamingContent && (
          <div className="flex h-full items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight neon-text-cyan">How can I help you today?</h2>
              <p className="text-sm sm:text-base text-white/60">Start a conversation to begin.</p>
            </div>
          </div>
        )}

        {hasSummary && (
          <div className="mb-6 p-4 rounded-lg glass-panel border border-cyan-400/20">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-medium neon-text-cyan">Conversation Summary</h3>
            </div>
            <p className="text-sm text-white/90 leading-loose">
              {thread.summary}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-5 sm:gap-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-start gap-3',
                message.role === 'user' ? 'justify-end flex-row-reverse' : 'justify-start'
              )}
            >
              <Message message={message} />
            </div>
          ))}
          
          {streamingContent && (
            <div className="flex items-start gap-3 justify-start">
               <Message message={{
                   id: 'streaming-temp',
                   role: 'assistant',
                   content: streamingContent,
                   createdAt: new Date(),
                   userId: 'ai',
                   threadId: 'temp',
                   embedding: []
               }} />
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
