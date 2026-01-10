"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface Message {
  role: string;
  content: string;
  isOptimistic?: boolean;
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
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className={`flex px-6 py-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`px-4 py-3 rounded-2xl max-w-[80%] ${
              m.role === "user"
                ? "bg-gradient-to-r from-cyan-400 to-violet-500 text-white"
                : "bg-white/10 text-white/90 border border-white/10"
            } ${m.isOptimistic ? "opacity-70" : ""}`}
            style={
              m.role === "user"
                ? {
                    boxShadow: m.isOptimistic ? "none" : "0 0 20px rgba(56, 189, 248, 0.3)",
                  }
                : {}
            }
          >
            {m.content}
            {m.isOptimistic && <span className="ml-2 text-xs italic opacity-70">(sending...)</span>}
          </div>
        </motion.div>
      ))}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="flex justify-start px-6 py-2"
        >
          <div className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2 text-white/90">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Pandora is thinking...</span>
          </div>
        </motion.div>
      )}
    </>
  );
}

