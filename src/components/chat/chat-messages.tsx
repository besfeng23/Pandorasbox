
'use client';

import { Message as MessageType, Thread } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Message } from './message';
import { FileText } from 'lucide-react';

interface ChatMessagesProps {
  messages: MessageType[];
  thread: Thread | null;
  userId: string;
}

export function ChatMessages({ messages, thread, userId }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const hasSummary = thread?.summary && thread.summary.length > 0;

  return (
    <div
      ref={scrollAreaRef}
      className="h-full w-full overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto px-4 py-8">
        {messages.length === 0 && !hasSummary && (
          <div className="flex h-full items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
              <p className="text-muted-foreground">Start a conversation to begin.</p>
            </div>
          </div>
        )}

        {hasSummary && (
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Conversation Summary</h3>
            </div>
            <p className="text-sm text-foreground">
              {thread.summary}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-start gap-4',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <Message message={message} />
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
