'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Send,
    Loader2,
    Paperclip,
    X,
    Mic,
    Smile,
    Command as CommandIcon,
    Sparkles,
    ChevronUp,
    Image as ImageIcon,
    ArrowUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';

import { VoiceInput } from './voice-input';

interface FloatingComposerProps {
    userId: string;
    onSubmit: (content: string | FormData, attachments?: { url: string; type: string; base64?: string }[]) => void;
    disabled?: boolean;
    isLoading?: boolean;
    placeholder?: string;
    className?: string;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export function FloatingComposer({
    userId,
    onSubmit,
    disabled = false,
    isLoading = false,
    placeholder = 'Message Universe...',
    className
}: FloatingComposerProps) {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<{ file: File; preview: string }[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
            textareaRef.current.style.height = `${newHeight}px`;

            if (newHeight > 60) {
                setIsExpanded(true);
            } else if (!input) {
                setIsExpanded(false);
            }
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

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if ((!input.trim() && attachments.length === 0) || disabled || isLoading) {
            return;
        }

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
        setIsExpanded(false);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className={cn("fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/5 transition-all duration-300", className)}>

            {/* Attachment Previews */}
            {attachments.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                    <div className="flex flex-wrap gap-3 max-w-3xl mx-auto">
                        {attachments.map((attachment, i) => (
                            <div key={i} className="group relative h-16 w-16 rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/50">
                                <img src={attachment.preview} alt="preview" className="h-full w-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeAttachment(i)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-4 w-4 text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="w-full md:max-w-3xl mx-auto px-2 pb-[env(safe-area-inset-bottom)] pt-2">
                <div className="flex items-end gap-2">
                    {/* Attach Button - Minimalist Left-Side */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || isLoading}
                        className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full mb-0.5"
                    >
                        <Paperclip className="h-5 w-5" />
                    </Button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.txt,.md"
                        multiple
                        className="hidden"
                    />

                    {/* Input Pill Container - The "Box" */}
                    <div className={cn(
                        "flex-1 flex items-center min-h-[44px] bg-white/10 border border-white/5 rounded-[26px] pl-4 pr-1.5 py-1 transition-colors relative",
                        "focus-within:bg-white/15 focus-within:border-white/10"
                    )}>
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            disabled={disabled || isLoading}
                            rows={1}
                            className={cn(
                                'flex-1 !bg-transparent border-none shadow-none focus-visible:ring-0 resize-none py-2 px-0 text-[16px] leading-normal max-h-[200px]',
                                'text-foreground placeholder:text-muted-foreground/50'
                            )}
                            style={{ backgroundColor: 'transparent' }}
                        />

                        {/* Right Actions (Dynamic Flip) */}
                        <div className="flex items-center gap-1 pl-1 shrink-0 pb-0.5">
                            {!input.trim() && attachments.length === 0 ? (
                                <VoiceInput
                                    userId={userId}
                                    onTranscriptionStatusChange={(status) => setIsRecording(status)}
                                    disabled={disabled || isLoading}
                                    onAudioSubmit={onSubmit}
                                />
                            ) : (
                                <Button
                                    type="button"
                                    onClick={() => handleSubmit()}
                                    disabled={disabled || isLoading}
                                    className={cn(
                                        "h-8 w-8 rounded-full shadow-sm hover:opacity-90 transition-all p-0 flex items-center justify-center",
                                        "bg-white text-black" // High Contrast Submit
                                    )}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                                    ) : (
                                        <ArrowUp className="h-5 w-5 stroke-[3]" />
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
