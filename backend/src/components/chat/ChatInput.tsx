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

/**
 * Chat input component with textarea and submit button
 */
export function ChatInput({
  onSubmit,
  disabled = false,
  isLoading = false,
  placeholder = 'Type your message...',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || disabled || isLoading) {
      return;
    }

    onSubmit(input);
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="relative group">
      <form onSubmit={handleSubmit} className="relative flex items-end gap-3 p-2 rounded-[26px] glass-surface-strong shadow-lg border-white/20 transition-all duration-300 focus-within:shadow-primary/10 focus-within:border-primary/30">
        <div className="relative flex-1 min-h-[48px] flex items-center">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className={cn(
              'flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 resize-none py-3 px-4 text-sm md:text-base selection:bg-primary/20',
              'placeholder:text-muted-foreground/50'
            )}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || disabled || isLoading}
          className={cn(
            "h-10 w-10 rounded-full shrink-0 transition-all duration-300",
            input.trim() ? "bg-primary shadow-md shadow-primary/30 scale-100" : "bg-muted text-muted-foreground scale-90"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className={cn("h-5 w-5 transition-transform duration-300", input.trim() && "translate-x-0.5 -translate-y-0.5")} />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </form>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-[28px] blur opacity-0 group-focus-within:opacity-100 transition duration-1000 group-hover:duration-200 pointer-events-none -z-10" />
    </div>
  );
}

