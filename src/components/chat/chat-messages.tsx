'use client';

import { Message as MessageType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Message } from './message';

interface ChatMessagesProps {
  messages: MessageType[];
  userId: string;
}

export function ChatMessages({ messages, userId }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div
      ref={scrollAreaRef}
      className="h-full w-full overflow-y-auto px-4 pt-4 pb-8"
    >
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center">
            <div className="text-center text-gray-500 bg-gray-900/50 p-4 rounded-lg">
                <p>No messages yet.</p>
                <p className="text-xs mt-1">Awaiting connection to database...</p>
                <p className="text-xs mt-2 font-mono">User ID: {userId}</p>
            </div>
        </div>
      )}
      <div className="flex flex-col gap-4">
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
