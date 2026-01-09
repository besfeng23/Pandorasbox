"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Mic } from "lucide-react";
import PandoraBoxInteractive from "@/app/(pandora-ui)/components/PandoraBoxInteractive";
import ChatMessages from "@/app/(pandora-ui)/components/ChatMessages";
import ChatInput from "@/app/(pandora-ui)/components/ChatInput";

async function sendMessage(message: string, sessionId: string) {
  try {
    // TODO: Implement chat API integration
    return "Chat functionality coming soon...";
  } catch (err: any) {
    console.error("Chat error:", err);
    return "⚠️  Connection issue.";
  }
}

export default function PandoraChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionId = "pandora-session";

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const reply = await sendMessage(userMsg.content, sessionId);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (error) {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️  Error sending message. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <ChatMessages messages={messages} isLoading={isLoading} />
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
        <PandoraBoxInteractive />

        <ChatInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask Pandora…"
        />

        <AnimatePresence mode="wait">
          {input ? (
            <motion.button
              key="send"
              onClick={handleSend}
              disabled={isLoading}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.div
              key="mic"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-2 bg-white/10 rounded-full"
            >
              <Mic className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

