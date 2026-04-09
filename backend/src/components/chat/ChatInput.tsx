'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  disabled = false,
  isLoading = false,
  placeholder = 'Message Pandora…',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [input]);

  const submit = () => {
    if (!input.trim() || disabled || isLoading) return;
    onSubmit(input.trim());
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-content-reading px-3 pb-3 pt-2 md:px-6 md:pb-5">
      <div className="rounded-xl border border-border/80 bg-card p-2 shadow-sm">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            aria-label="Message composer"
            className={cn('max-h-[220px] min-h-[44px] resize-none border-0 bg-transparent pr-2 shadow-none focus-visible:ring-0')}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || disabled || isLoading} className="h-11 w-11 shrink-0 rounded-lg">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
        <p className="px-1 pb-1 text-[11px] text-muted-foreground">Press Enter to send • Shift+Enter for new line</p>
      </div>
    </form>
  );
}
