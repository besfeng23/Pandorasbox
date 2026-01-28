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

  return (
    <div className="flex flex-col gap-6 p-6">
      {messages.map((message, index) => {
        const isUser = message.role === 'user';

        return (
          <div
            key={index}
            className={cn(
              'flex items-start gap-4 animate-in-slide',
              isUser ? 'flex-row-reverse' : 'flex-row'
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <Avatar className="h-9 w-9 shrink-0 border border-border shadow-sm">
              <AvatarFallback className={cn(
                isUser ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
              )}>
                {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5 text-primary" />}
              </AvatarFallback>
            </Avatar>

            <div
              className={cn(
                'max-w-[85%] rounded-[20px] px-5 py-3 text-sm md:text-base selection:bg-primary/20',
                isUser
                  ? 'chat-bubble-user rounded-tr-none'
                  : 'chat-bubble-assistant rounded-tl-none'
              )}
            >
              {isUser ? (
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {message.content}
                </p>
              ) : (
                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none leading-relaxed prose-p:my-1 prose-pre:my-2 prose-code:text-primary">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content || '...'}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

