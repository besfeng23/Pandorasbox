'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, Loader2, Paperclip, X, Sparkles, Pin, HelpCircle, StopCircle } from 'lucide-react';
import React, { useRef, useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import { VoiceInput } from './voice-input';
import { useConnectionStore } from '@/store/connection';
import { useSuggestions } from '@/hooks/use-suggestions';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  userId: string;
  onMessageSubmit: (formData: FormData) => boolean;
  isSending: boolean;
  onStop?: () => void; // New prop for stop functionality
}

function FollowUpSuggestions({ userId, onSuggestionClick }: { userId: string, onSuggestionClick: (suggestion: string) => void }) {
  const { suggestions, dismissSuggestion, pinSuggestion, pinnedIds } = useSuggestions(userId);
  const [originalSuggestions, setOriginalSuggestions] = useState<string[]>([]);

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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
        <span>Suggested questions:</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Why these suggestions?"
            >
              <HelpCircle className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="glass-panel-strong border border-primary/20 text-foreground max-w-xs">
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
                      ? "border-yellow-400/40 hover:border-yellow-400/60 text-yellow-500 hover:text-yellow-600 shadow-sm"
                      : "border-primary/20 hover:border-primary/30 hover:shadow-sm text-foreground/90 hover:text-primary"
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
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      const origIndex = originalSuggestions.indexOf(suggestion);
                      if (origIndex >= 0) pinSuggestion(origIndex);
                    }}
                    title={isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin className={cn("h-3 w-3", isPinned && "fill-current text-yellow-500")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
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

export function ChatInput({ userId, onMessageSubmit, isSending, onStop }: ChatInputProps) {
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const message = formData.get('message') as string;

    if (!message.trim() && !imagePreview) return;

    if (imagePreview) {
      formData.append('image_data', imagePreview);
    }

    // Append ID token for authentication
    const idToken = await (await import('@/firebase')).getAuthToken();
    if (idToken) {
      formData.append('idToken', idToken);
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

  const handleSuggestionClick = async (suggestion: string) => {
    const idToken = await (await import('@/firebase')).getAuthToken();
    const formData = new FormData();
    formData.append('message', suggestion);
    formData.append('userId', userId);
    if (idToken) {
      formData.append('idToken', idToken);
    }
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
        className="relative flex flex-col gap-2 bg-background/60 backdrop-blur-xl rounded-[20px] border border-black/5 dark:border-white/10 shadow-sm"
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute bottom-2 left-2 h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 touch-manipulation hover:scale-110 active:scale-95 transition-transform duration-200"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                aria-label="Attach image"
              >
                <Paperclip className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="glass-panel-strong border border-primary/20 text-foreground">
              <p>Attach image</p>
            </TooltipContent>
          </Tooltip>

          <Textarea
            ref={textareaRef}
            name="message"
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={isTranscribing ? "Transcribing audio..." : "Message Pandora..."}
            className="w-full resize-none max-h-48 pr-20 sm:pr-24 pl-11 sm:pl-12 text-[15px] leading-relaxed rounded-2xl bg-transparent border-0 focus-visible:ring-0 focus-visible:outline-none text-foreground placeholder:text-muted-foreground/70 min-h-[44px] sm:min-h-[40px] py-3 no-scrollbar"
            rows={1}
            disabled={isProcessing}
            aria-label="Chat message input"
            style={{ fontSize: '16px' }} // Prevents zoom on iOS
          />

          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <VoiceInput
                    userId={userId}
                    onTranscriptionStatusChange={setIsTranscribing}
                    disabled={isProcessing}
                    onAudioSubmit={onMessageSubmit}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="glass-panel-strong border border-primary/20 text-foreground">
                <p>Voice input (hold to record)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                {isSending && onStop ? (
                  <Button
                    type="button"
                    size="icon"
                    onClick={onStop}
                    className="h-9 w-9 sm:h-8 sm:w-8 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full touch-manipulation shadow-sm hover:scale-110 active:scale-95 transition-transform duration-200"
                    aria-label="Stop generation"
                  >
                    <StopCircle className="h-4 w-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 sm:h-8 sm:w-8 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full touch-manipulation shadow-sm hover:scale-110 active:scale-95 transition-transform duration-200 send-action-pulse"
                    disabled={isProcessing}
                    aria-label="Send message"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <ArrowUp className="h-4 w-4" strokeWidth={1.5} />
                    )}
                  </Button>
                )}
              </TooltipTrigger>
              <TooltipContent className="glass-panel-strong border border-primary/20 text-foreground">
                <p>{isSending ? "Stop generation" : "Send message"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </form>
    </div>
  );
}
