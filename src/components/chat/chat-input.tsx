'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, Loader2, Paperclip, X, Sparkles } from 'lucide-react';
import React, { useRef, useState, useTransition } from 'react';
import { submitUserMessage } from '@/app/actions';
import Image from 'next/image';
import { VoiceInput } from './voice-input';
import { useConnectionStore } from '@/store/connection';
import { useSuggestions } from '@/hooks/use-suggestions';
import { AnimatePresence, motion } from 'framer-motion';

interface ChatInputProps {
  userId: string;
}

function FollowUpSuggestions({ userId }: { userId: string }) {
  const { suggestions } = useSuggestions(userId);
  const [isPending, startTransition] = useTransition();

  const handleSuggestionClick = (suggestion: string) => {
    const formData = new FormData();
    formData.append('message', suggestion);
    formData.append('userId', userId);
    
    startTransition(async () => {
      await submitUserMessage(formData);
    });
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <Sparkles className="h-4 w-4 text-yellow-500 shrink-0" />
      {suggestions.map((suggestion, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={isPending}
          >
            {suggestion}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}


export function ChatInput({ userId }: ChatInputProps) {
  const [isPending, startTransition] = useTransition();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { addPendingMessage } = useConnectionStore();
  

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const message = formData.get('message') as string;

    if (!message.trim() && !imagePreview) return;

    if (imagePreview) {
        formData.append('image_data', imagePreview);
    }

    startTransition(async () => {
      const result = await submitUserMessage(formData);
      if (result?.messageId) {
        addPendingMessage(result.messageId);
      }
    });

    formRef.current?.reset();
    setImagePreview(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const isProcessing = isPending || isTranscribing;

  return (
    <div className="flex flex-col gap-2">
       <AnimatePresence>
        <FollowUpSuggestions userId={userId} />
      </AnimatePresence>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="relative flex flex-col gap-2"
      >
        {imagePreview && (
          <div className="relative w-24 h-24 rounded-md overflow-hidden border">
            <Image src={imagePreview} alt="Selected preview" layout="fill" objectFit="cover" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 bg-black/50 text-white hover:bg-black/75"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="relative flex items-end">
          <input type="hidden" name="userId" value={userId} />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
            name="image_file"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute bottom-2 left-2 h-8 w-8 text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            aria-label="Attach image"
          >
            <Paperclip className="h-4 w-4" strokeWidth={1.5} />
          </Button>

          <Textarea
            ref={textareaRef}
            name="message"
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={isTranscribing ? "Transcribing audio..." : "Ask Pandora anything, or attach an image..."}
            className="w-full resize-none max-h-48 pr-24 pl-12 text-base leading-relaxed"
            rows={1}
            disabled={isProcessing}
            aria-label="Chat message input"
          />

          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <VoiceInput userId={userId} onTranscriptionStatusChange={setIsTranscribing} disabled={isProcessing} />
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isProcessing}
              aria-label="Send message"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <ArrowUp className="h-4 w-4" strokeWidth={1.5} />
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}