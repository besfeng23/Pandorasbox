
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
      className="h-full w-full overflow-y-auto px-4 pt-20 pb-8"
    >
      <div className="flex flex-col gap-4">
        {hasSummary && (
            <motion.div
                layout
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="w-full my-2 p-4 rounded-lg bg-muted border-l-4 border-primary shadow-sm"
            >
                <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    <h3 className="font-semibold text-base text-primary">Conversation Summary</h3>
                </div>
                <p className="text-sm text-muted-foreground italic">
                    {thread.summary}
                </p>
            </motion.div>
        )}
        
        {messages.length === 0 && !hasSummary && (
            <div className="flex h-full items-center justify-center">
                <div className="text-center text-gray-500 bg-gray-900/50 p-4 rounded-lg">
                    <p>No messages yet.</p>
                </div>
            </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              layout
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -50 }}
              transition={{
                type: 'spring',
                stiffness: 350,
                damping: 30,
              }}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <Message message={message} />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
