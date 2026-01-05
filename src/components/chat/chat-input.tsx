
'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, Loader2, Paperclip, X, Sparkles } from 'lucide-react';
import React, { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { VoiceInput } from './voice-input';
import { useConnectionStore } from '@/store/connection';
import { useSuggestions } from '@/hooks/use-suggestions';
import { AnimatePresence, motion } from 'framer-motion';

interface ChatInputProps {
  userId: string;
  onMessageSubmit: (formData: FormData) => boolean;
  isSending: boolean;
}

function FollowUpSuggestions({ userId, onSuggestionClick }: { userId: string, onSuggestionClick: (suggestion: string) => void }) {
    const { suggestions } = useSuggestions(userId);
  
    if (suggestions.length === 0) {
      return null;
    }
  
    return (
      <div className="mb-2 overflow-x-auto overflow-y-hidden">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-max sm:min-w-0 max-w-full">
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400 shrink-0" />
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0"
            >
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8 sm:h-7 px-2 sm:px-3 touch-manipulation min-h-[36px] sm:min-h-0 glass-panel border border-purple-400/20 hover:border-purple-400/30 hover:shadow-neon-purple-sm text-white/90 hover:text-purple-400 transition-all whitespace-nowrap max-w-[200px] sm:max-w-none truncate"
                onClick={() => onSuggestionClick(suggestion)}
                title={suggestion.length > 20 ? suggestion : undefined}
              >
                {suggestion}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    );
}

export function ChatInput({ userId, onMessageSubmit, isSending }: ChatInputProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

    const isProcessing = onMessageSubmit(formData);

    if (!isProcessing) {
        formRef.current?.reset();
        setImagePreview(null);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const formData = new FormData();
    formData.append('message', suggestion);
    formData.append('userId', userId);
    onMessageSubmit(formData);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const isProcessing = isSending || isTranscribing;

  return (
    <div className="flex flex-col gap-2">
       <AnimatePresence>
        <FollowUpSuggestions userId={userId} onSuggestionClick={handleSuggestionClick} />
      </AnimatePresence>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="relative flex flex-col gap-2 glass-panel-strong rounded-2xl border border-cyan-400/15 shadow-neon-cyan-sm"
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
            className="absolute bottom-2 left-2 h-9 w-9 sm:h-8 sm:w-8 text-white/60 hover:text-cyan-400 hover:bg-white/10 touch-manipulation"
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
            placeholder={isTranscribing ? "Transcribing audio..." : "Message Pandora..."}
            className="w-full resize-none max-h-48 pr-20 sm:pr-24 pl-11 sm:pl-12 text-base sm:text-sm leading-relaxed rounded-2xl bg-transparent border-0 focus-visible:ring-0 focus-visible:outline-none text-white placeholder:text-white/40 min-h-[44px] sm:min-h-[40px] py-2.5 sm:py-2"
            rows={1}
            disabled={isProcessing}
            aria-label="Chat message input"
            style={{ fontSize: '16px' }} // Prevents zoom on iOS
          />

          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <VoiceInput 
                userId={userId} 
                onTranscriptionStatusChange={setIsTranscribing} 
                disabled={isProcessing} 
                onAudioSubmit={onMessageSubmit}
            />
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 sm:h-8 sm:w-8 bg-gradient-to-br from-cyan-400/90 to-purple-500/90 text-white hover:from-cyan-300 hover:to-purple-400 rounded-full touch-manipulation shadow-neon-cyan-sm"
              disabled={isProcessing}
              aria-label="Send message"
            >
              {isSending ? (
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
