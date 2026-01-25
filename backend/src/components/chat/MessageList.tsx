'use client';

import { type ChatMessage } from '@/lib/llm/llm-client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageListProps {
  messages: ChatMessage[];
}

/**
 * Scrollable message list component that displays user and assistant messages
 * Automatically scrolls to bottom when new messages arrive
 */
export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">Start a conversation</p>
          <p className="text-sm text-muted-foreground mt-2">
            Send a message to begin chatting with Pandora
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message, index) => {
        const isUser = message.role === 'user';

        return (
          <div
            key={index}
            className={cn(
              'flex items-start gap-3',
              isUser ? 'justify-end' : 'justify-start'
            )}
          >
            {!isUser && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
            )}

            <div
              className={cn(
                'max-w-[80%] rounded-lg px-4 py-3',
                isUser
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground'
              )}
            >
              {isUser ? (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content || '...'}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {isUser && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        );
      })}
    </div>
  );
}

