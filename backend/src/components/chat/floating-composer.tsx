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
        <div className={cn("relative w-full max-w-4xl mx-auto px-4 pb-4 animate-in-up transition-all duration-500", className)}>
            {/* Attachment Previews Floating above */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4 px-2">
                    {attachments.map((attachment, i) => (
                        <div key={i} className="group relative h-20 w-20 rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-in-zoom pointer-events-auto">
                            <img src={attachment.preview} alt="preview" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => removeAttachment(i)}
                                    className="bg-red-500 rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <X className="h-4 w-4 text-white" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Container */}
            <div className={cn(
                "relative flex flex-col p-2 rounded-[26px] transition-all duration-500",
                "bg-black/60 border border-white/10 backdrop-blur-xl shadow-2xl",
                "focus-within:bg-black/80 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/10",
                isExpanded && "rounded-[24px]"
            )}>

                {/* Input Area */}
                <div className="flex items-end gap-2 pr-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={disabled || isLoading}
                                    className="h-10 w-10 rounded-full mt-1 shrink-0 text-muted-foreground hover:text-primary transition-all hover:bg-primary/10"
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

                    <div className="flex-1 min-h-[44px] flex items-center py-1">
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            disabled={disabled || isLoading}
                            rows={1}
                            className={cn(
                                'flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 resize-none py-1.5 px-2 text-base leading-relaxed',
                                'placeholder:text-muted-foreground/30 font-medium'
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-1 mb-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                        <VoiceInput
                                            userId={userId}
                                            onTranscriptionStatusChange={(status) => setIsRecording(status)}
                                            disabled={disabled || isLoading}
                                            onAudioSubmit={onSubmit}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">Voice Input</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Button
                            type="button"
                            onClick={() => handleSubmit()}
                            disabled={(!input.trim() && attachments.length === 0) || disabled || isLoading}
                            className={cn(
                                "h-10 w-10 rounded-full transition-all duration-500 shrink-0",
                                (input.trim() || attachments.length > 0)
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                    : "bg-white/5 text-muted-foreground opacity-50 scale-90"
                            )}
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className={cn("h-5 w-5 transition-transform", (input.trim() || attachments.length > 0) && "translate-x-0.5 -translate-y-0.5")} />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Toolbar (Appears when focused or has content) */}
                <div className={cn(
                    "flex items-center justify-between px-2 overflow-hidden transition-all duration-500",
                    (input.length > 0 || isExpanded) ? "h-10 opacity-100 mt-1 mb-1" : "h-0 opacity-0"
                )}>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] py-0 px-2 flex items-center gap-1.5 font-medium text-muted-foreground">
                            <Sparkles className="h-2.5 w-2.5 text-primary" />
                            Sovereign Ingress
                        </Badge>
                        <div className="h-1 w-1 rounded-full bg-white/10" />
                        <button className="text-[10px] font-semibold text-muted-foreground/60 hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-tighter">
                            <CommandIcon className="h-3 w-3" />
                            Commands
                        </button>
                    </div>

                    <div className="flex items-center gap-3 pr-2">
                        <button className="text-muted-foreground/40 hover:text-primary transition-colors">
                            <Smile className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => {
                                setInput('');
                                setAttachments([]);
                                setIsExpanded(false);
                            }}
                            className="text-xs font-bold text-muted-foreground/40 hover:text-red-500/60 transition-colors uppercase tracking-widest"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Shadow Glow Background */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 rounded-[34px] blur-xl opacity-0 focus-within:opacity-100 transition-opacity duration-700 pointer-events-none -z-10" />
        </div>
    );
}
