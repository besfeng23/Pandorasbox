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
        <div className={cn("relative w-full max-w-4xl mx-auto px-4 pb-4", className)}>
            {/* Attachment Previews */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map((attachment, i) => (
                        <div key={i} className="group relative h-14 w-14 rounded-lg overflow-hidden border border-border bg-muted">
                            <img src={attachment.preview} alt="preview" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => removeAttachment(i)}
                                    className="bg-destructive text-white rounded-full p-1"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Container */}
            <div className="input-container flex flex-col p-1.5 md:p-2">
                {/* Input Area */}
                <div className="flex items-end gap-1 md:gap-2 pr-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || isLoading}
                        className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground hover:bg-muted"
                    >
                        <Paperclip className="h-4 w-4 md:h-5 md:w-5 stroke-[1]" />
                    </Button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.txt,.md"
                        multiple
                        className="hidden"
                    />

                    <div className="flex-1 min-h-[44px] flex items-center">
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            disabled={disabled || isLoading}
                            rows={1}
                            className="flex-1 bg-transparent border-none focus-visible:ring-0 resize-none py-2.5 px-2 text-[15px] md:text-base placeholder:text-muted-foreground/30"
                        />
                    </div>

                    <div className="flex items-center gap-1 md:gap-2">
                        <div className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center">
                            <VoiceInput
                                userId={userId}
                                onTranscriptionStatusChange={(status) => setIsRecording(status)}
                                disabled={disabled || isLoading}
                                onAudioSubmit={onSubmit}
                            />
                        </div>

                        <Button
                            type="button"
                            onClick={() => handleSubmit()}
                            disabled={(!input.trim() && attachments.length === 0) || disabled || isLoading}
                            variant="ghost"
                            className={cn(
                                "h-10 w-10 md:h-12 md:w-12 rounded-lg transition-colors",
                                (input.trim() || attachments.length > 0)
                                    ? "text-primary hover:bg-primary/5"
                                    : "text-muted-foreground opacity-30"
                            )}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 md:h-5 md:w-5 stroke-[1]" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
