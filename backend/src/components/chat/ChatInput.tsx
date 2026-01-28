'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSubmit: (message: string, attachments?: { url: string; type: string; base64?: string }[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

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
  const [attachments, setAttachments] = useState<{ file: File; preview: string }[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!input.trim() && attachments.length === 0) || disabled || isLoading) {
      return;
    }

    // Convert attachments to base64
    const attachmentData = await Promise.all(attachments.map(async a => {
      const base64 = await fileToBase64(a.file);
      return {
        url: a.preview,
        type: a.file.type,
        base64: base64
      };
    }));

    onSubmit(input, attachmentData);
    setInput('');
    setAttachments([]);

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
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-2">
          {attachments.map((attachment, i) => (
            <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-white/20 shadow-sm animate-in-fade">
              <img src={attachment.preview} alt="preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 hover:bg-black/80 transition-colors"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative flex items-end gap-3 p-2 rounded-[26px] glass-surface-strong shadow-lg border-white/20 transition-all duration-300 focus-within:shadow-primary/10 focus-within:border-primary/30">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-primary transition-colors"
        >
          <Paperclip className="h-5 w-5" />
          <span className="sr-only">Attach file</span>
        </Button>

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
          disabled={(!input.trim() && attachments.length === 0) || disabled || isLoading}
          className={cn(
            "h-10 w-10 rounded-full shrink-0 transition-all duration-300",
            (input.trim() || attachments.length > 0) ? "bg-primary shadow-md shadow-primary/30 scale-100" : "bg-muted text-muted-foreground scale-90"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className={cn("h-5 w-5 transition-transform duration-300", (input.trim() || attachments.length > 0) && "translate-x-0.5 -translate-y-0.5")} />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </form>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-[28px] blur opacity-0 group-focus-within:opacity-100 transition duration-1000 group-hover:duration-200 pointer-events-none -z-10" />
    </div>
  );
}

