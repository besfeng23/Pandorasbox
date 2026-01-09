"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Mic } from "lucide-react";
import PandoraBoxInteractive from "@/app/(pandora-ui)/components/PandoraBoxInteractive";
import ChatMessages from "@/app/(pandora-ui)/components/ChatMessages";
import ChatInput from "@/app/(pandora-ui)/components/ChatInput";
import { submitUserMessage } from "@/app/actions";
import { useChatHistory } from "@/hooks/use-chat-history";
import { useUser } from "@/firebase";
import { createThread } from "@/app/actions";
import { Message } from "@/lib/types";

export default function PandoraChatPage() {
  const { user } = useUser();
  const userId = user?.uid || null;
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Initialize thread on mount
  useEffect(() => {
    if (userId && !threadId) {
      createThread(userId).then(setThreadId).catch(console.error);
    }
  }, [userId, threadId]);

  // Fetch real-time messages using the existing hook
  const { messages, isLoading } = useChatHistory(userId, threadId);

  // Convert Message type to simple format for ChatMessages component
  const chatMessages = messages.map((msg: Message) => ({
    role: msg.role,
    content: msg.content || "",
  }));

  const handleSend = async () => {
    if (!input.trim() || isSending || !userId) return;

    const messageContent = input.trim();
    setInput("");
    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append("message", messageContent);
      formData.append("userId", userId);
      if (threadId) {
        formData.append("threadId", threadId);
      }
      formData.append("source", "text");

      const result = await submitUserMessage(formData);
      
      if (result.threadId && !threadId) {
        setThreadId(result.threadId);
      }

      if (result.error) {
        console.error("Message error:", result.error);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <ChatMessages 
          messages={chatMessages} 
          isLoading={isLoading || isSending} 
        />
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
        <PandoraBoxInteractive />

        <ChatInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask Pandora…"
          disabled={isSending || !userId}
        />

        <AnimatePresence mode="wait">
          {input ? (
            <motion.button
              key="send"
              onClick={handleSend}
              disabled={isSending || !userId}
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

