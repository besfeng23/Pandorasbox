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
    Image as ImageIcon
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
    placeholder = 'Type a message or "/" for commands...',
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

    const toggleRecording = () => {
        setIsRecording(!isRecording);
        // In production, trigger Web Speech API here
    };

    return (
        <div className={cn("fixed bottom-0 left-0 right-0 z-50 bg-black/85 backdrop-blur-xl border-t border-white/10 transition-all duration-300", className)}>

            {/* Attachment Previews (Floating above the bar) */}
            {attachments.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
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

            <div className="w-full md:max-w-3xl mx-auto p-1 md:p-4 safe-area-pb">
                {/* Main Input Row */}
                <div className="flex items-end gap-2">
                    {/* Attach Button */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={disabled || isLoading}
                                    className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full"
                                >
                                    <Paperclip className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Attach files</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.txt,.md"
                        multiple
                        className="hidden"
                    />

                    {/* Input Pill Container */}
                    <div className={cn(
                        "flex-1 flex items-end min-h-[44px] bg-white/5 border border-white/10 rounded-[24px] px-2 py-1 transition-colors relative",
                        "focus-within:bg-white/10 focus-within:border-white/20"
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
                                'flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 resize-none py-2.5 px-2 text-base leading-relaxed max-h-[200px]',
                                'text-foreground placeholder:text-muted-foreground/50'
                            )}
                        />

                        {/* Right Actions (Inside Pill) */}
                        <div className="flex items-center gap-1 pb-1 pr-1">
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
                                    className="h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-all p-0 flex items-center justify-center"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer / Toolbar - Hidden on mobile if cramped, or simple text */}
                <div className="hidden md:flex items-center justify-between mt-2 px-2 text-[10px] text-muted-foreground/60">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-white/10 bg-transparent text-muted-foreground/60 text-[10px] h-5 px-1.5 font-normal">
                            Sovereign Ingress
                        </Badge>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <CommandIcon className="h-3 w-3" /> Commands
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Enter to send, Shift+Enter to newline</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
