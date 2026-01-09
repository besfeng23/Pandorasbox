"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface Message {
  role: string;
  content: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

export default function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  if (messages.length === 0 && !isLoading) {
    return null; // Empty state - just show black background
  }

  return (
    <>
      {messages.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`px-4 py-3 rounded-2xl max-w-[80%] ${
              m.role === "user"
                ? "bg-gradient-to-r from-blue-600 to-violet-600"
                : "bg-white/10"
            }`}
          >
            {m.content}
          </div>
        </motion.div>
      ))}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start"
        >
          <div className="px-4 py-3 rounded-2xl bg-white/10 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Pandora is thinking...</span>
          </div>
        </motion.div>
      )}
    </>
  );
}

