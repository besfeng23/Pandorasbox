'use client';

import { type ChatMessage } from '@/lib/llm/llm-client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Bot, Sparkles } from 'lucide-react';
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
          className="w-full"
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
                className="h-auto max-w-full rounded-full px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground"
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
    <div className="mx-auto flex w-full max-w-content-reading flex-col gap-5 px-3 py-5 md:px-6 md:py-6">
      {messages.map((message, index) => {
        const isUser = message.role === 'user';
        const isStreamingPlaceholder = !isUser && !message.content?.trim();

        return (
          <article key={index} className={cn('flex items-end gap-3', isUser ? 'justify-end' : 'justify-start')}>
            {!isUser && (
              <Avatar className="h-8 w-8 shrink-0 border border-border/70">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}

            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm',
                isUser
                  ? 'rounded-br-md bg-primary text-primary-foreground'
                  : 'rounded-bl-md border border-border/80 bg-card text-foreground'
              )}
            >
              {isUser ? (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              ) : isStreamingPlaceholder ? (
                <div className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/80" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/40 [animation-delay:240ms]" />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-pre:rounded-lg">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                </div>
              )}
            </div>

            {isUser && (
              <Avatar className="h-8 w-8 shrink-0 border border-border/70">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </article>
        );
      })}
    </div>
  );
}
