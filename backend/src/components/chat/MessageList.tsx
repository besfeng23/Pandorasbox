'use client';

import { Message } from './message';
import { type Message as MessageType } from '@/lib/types';
import { Bot } from 'lucide-react';

interface MessageListProps {
  messages: MessageType[];
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  onSpeak?: (content: string) => void;
}

/**
 * Scrollable message list component that displays user and assistant messages
 * Automatically scrolls to bottom when new messages arrive
 */
export function MessageList({
  messages,
  onRegenerate,
  isRegenerating,
  onSpeak
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center animate-in-fade">
        <div className="text-center">
          <Bot className="mx-auto h-12 w-12 text-primary/40 mb-4 animate-pulse-subtle" />
          <p className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Welcome to Pandora
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[250px] mx-auto">
            Your advanced AI companion for creativity and exploration.
          </p>
        </div>
      </div>
    );
  }

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');

  return (
    <div className="flex flex-col gap-4 p-0 md:gap-6 md:p-6">
      {messages.map((message, i) => (
        <div key={message.id} className="animate-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
          <Message
            message={message}
            onRegenerate={onRegenerate}
            isLastAssistantMessage={message.id === lastAssistantMessage?.id}
            isRegenerating={isRegenerating}
            onSpeak={onSpeak ? () => onSpeak(message.content) : undefined}
          />
        </div>
      ))}
    </div>
  );
}

