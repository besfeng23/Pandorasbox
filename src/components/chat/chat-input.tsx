
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
    const { suggestions, dismissSuggestion, pinSuggestion, pinnedIds } = useSuggestions(userId);
    const [originalSuggestions, setOriginalSuggestions] = useState<string[]>([]);
  
    // Track original suggestions for dismiss/pin functionality
    useEffect(() => {
      if (suggestions.length > 0) {
        setOriginalSuggestions(suggestions);
      }
    }, [suggestions.length]);
  
    if (suggestions.length === 0) {
      return null;
    }
  
    const getSuggestionId = (suggestion: string, index: number) => {
      const originalIndex = originalSuggestions.indexOf(suggestion);
      return originalIndex >= 0 ? `${originalIndex}-${suggestion.substring(0, 20)}` : `${index}-${suggestion.substring(0, 20)}`;
    };
  
    return (
      <div className="mb-2 space-y-2">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
          <span>Suggested questions:</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-white/40 hover:text-white/60"
                aria-label="Why these suggestions?"
              >
                <HelpCircle className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="glass-panel-strong border border-cyan-400/30 text-white max-w-xs">
              <p>These suggestions are AI-generated based on your conversation context to help you continue the discussion.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-max sm:min-w-0 max-w-full">
          {suggestions.map((suggestion, index) => {
            const suggestionId = getSuggestionId(suggestion, index);
            const isPinned = pinnedIds.has(suggestionId);
            return (
              <motion.div
                key={`${suggestion}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="flex-shrink-0 group/suggestion relative"
              >
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "text-xs h-8 sm:h-7 px-2 sm:px-3 touch-manipulation min-h-[36px] sm:min-h-0 glass-panel border transition-all whitespace-nowrap max-w-[200px] sm:max-w-none truncate",
                      isPinned 
                        ? "border-yellow-400/40 hover:border-yellow-400/60 text-yellow-400/90 hover:text-yellow-400 shadow-neon-yellow-sm"
                        : "border-purple-400/20 hover:border-purple-400/30 hover:shadow-neon-purple-sm text-white/90 hover:text-purple-400"
                    )}
                    onClick={() => onSuggestionClick(suggestion)}
                    title={suggestion.length > 20 ? suggestion : undefined}
                  >
                    {isPinned && <Pin className="h-3 w-3 mr-1 fill-current" />}
                    {suggestion}
                  </Button>
                  <div className="flex gap-0.5 opacity-0 group-hover/suggestion:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white/40 hover:text-white/60"
                      onClick={(e) => {
                        e.stopPropagation();
                        const origIndex = originalSuggestions.indexOf(suggestion);
                        if (origIndex >= 0) pinSuggestion(origIndex);
                      }}
                      title={isPinned ? "Unpin" : "Pin"}
                    >
                      <Pin className={cn("h-3 w-3", isPinned && "fill-current text-yellow-400")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white/40 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        const origIndex = originalSuggestions.indexOf(suggestion);
                        if (origIndex >= 0) dismissSuggestion(origIndex);
                      }}
                      title="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
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
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        <AnimatePresence>
          <FollowUpSuggestions userId={userId} onSuggestionClick={handleSuggestionClick} />
        </AnimatePresence>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="relative flex flex-col gap-2 glass-panel-strong rounded-2xl border border-cyan-400/10 shadow-neon-cyan-sm"
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
            className="absolute bottom-2 left-2 h-9 w-9 sm:h-8 sm:w-8 text-white/60 hover:text-cyan-400 hover:bg-white/10 touch-manipulation hover:scale-110 active:scale-95 transition-transform duration-200"
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
              className="h-9 w-9 sm:h-8 sm:w-8 bg-gradient-to-br from-cyan-400/90 to-purple-500/90 text-white hover:from-cyan-300 hover:to-purple-400 rounded-full touch-manipulation shadow-neon-cyan-sm hover:scale-110 active:scale-95 transition-transform duration-200"
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
    </TooltipProvider>
  );
}
