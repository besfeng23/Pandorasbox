"use client";

import { InputHTMLAttributes } from "react";

interface ChatInputProps extends InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
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
  return (
    <input
      className="flex-1 bg-black/60 rounded-md px-4 py-2 outline-none text-white placeholder:text-gray-500 disabled:opacity-50 border border-transparent focus:border-white/10"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
      {...props}
    />
  );
}

