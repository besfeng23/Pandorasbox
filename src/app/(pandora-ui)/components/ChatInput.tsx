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
      className="flex-1 bg-transparent rounded-full px-4 py-3 outline-none text-white placeholder:text-white/40 disabled:opacity-50 border border-transparent focus:border-white/10 resize-none leading-relaxed"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
      rows={1}
      {...props}
    />
  );
}

