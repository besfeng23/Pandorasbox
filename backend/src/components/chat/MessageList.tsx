'use client';

import { type ChatMessage } from './ChatContainer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StateBlock } from '@/components/ui/state-block';

interface MessageListProps {
  messages: ChatMessage[];
  onExampleSelect?: (prompt: string) => void;
  examplesDisabled?: boolean;
}

const examplePrompts = [
  'Summarize what we decided last time.',
  'Help me turn this idea into a launch plan.',
  'Compare these options and recommend one.',
];

export function MessageList({ messages, onExampleSelect, examplesDisabled = false }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="mx-auto flex h-full w-full max-w-content-reading items-center px-4 py-8">
        <StateBlock
          icon={<Sparkles className="h-8 w-8" />}
          title="Start with a task."
          description="Ask a question, build a plan, or pull from memory."
          className="w-full border-border bg-card/60 shadow-sm"
        >
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {examplePrompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                disabled={!onExampleSelect || examplesDisabled}
                onClick={() => onExampleSelect?.(prompt)}
                className="h-auto max-w-full rounded-full border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </StateBlock>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-content-reading flex-col gap-6 px-3 py-6 md:px-6 md:py-8">
      {messages.map((message, index) => {
        const isUser = message.role === 'user';
        const isStreamingPlaceholder = !isUser && !message.content?.trim();
        const messageKey = message.id ?? `${message.role}-${index}`;

        return (
          <article key={messageKey} className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
            {!isUser && (
              <Avatar className="mt-1 h-7 w-7 shrink-0 border border-border bg-card">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <Bot className="h-3.5 w-3.5" />
                </AvatarFallback>
              </Avatar>
            )}

            <div className={cn('min-w-0', isUser ? 'max-w-[78%] sm:max-w-[70%]' : 'max-w-[calc(100%-2.5rem)] flex-1')}>
              <div
                className={cn(
                  'text-sm leading-6',
                  isUser
                    ? 'rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground shadow-sm'
                    : 'px-1 py-0.5 text-foreground'
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                ) : isStreamingPlaceholder ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-muted-foreground">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/80" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/40 [animation-delay:240ms]" />
                    <span className="sr-only">Assistant is responding</span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:mb-2 prose-headings:mt-5 prose-p:my-3 prose-p:leading-7 prose-a:text-primary prose-strong:text-foreground prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-blockquote:border-border prose-blockquote:text-muted-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-foreground prose-pre:my-4 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-muted prose-pre:p-4 prose-pre:text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
