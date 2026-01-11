"use client";

import { TextareaHTMLAttributes, useEffect, useRef } from "react";

interface ChatInputProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChange,
  onKeyDown,
  placeholder = "Type a message...",
  disabled,
  ...props
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autosize (mobile-friendly, video-like)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className="flex-1 bg-transparent rounded-xl px-2 py-2 outline-none text-foreground placeholder:text-muted-foreground disabled:opacity-50 border border-transparent focus:border-transparent resize-none leading-relaxed min-h-[44px]"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
      rows={1}
      style={{ fontSize: "16px" }}
      {...props}
    />
  );
}

