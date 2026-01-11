"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import ChatMessages from "@/app/(pandora-ui)/components/ChatMessages";
import ChatInput from "@/app/(pandora-ui)/components/ChatInput";
import { submitUserMessage, transcribeAndProcessMessage } from "@/app/actions";
import { useChatHistory } from "@/hooks/use-chat-history";
import { useUser } from "@/firebase";
import { createThreadAuthed } from "@/app/actions";
import { Message } from "@/lib/types";
import { VoiceInput } from "@/components/chat/voice-input";
import { useSearchParams } from "next/navigation";

export default function PandoraChatPage() {
  const { user } = useUser();
  const userId = user?.uid || null;
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const searchParams = useSearchParams();

  // Initialize thread on mount
  useEffect(() => {
    const paramThreadId = searchParams.get("threadId");
    if (paramThreadId) {
      setThreadId(paramThreadId);
      return;
    }

    if (user && userId && !threadId) {
      user
        .getIdToken()
        .then((token) => createThreadAuthed(token))
        .then(setThreadId)
        .catch(console.error);
    }
  }, [user, userId, threadId, searchParams]);

  // Fetch real-time messages using the existing hook
  const { messages, isLoading } = useChatHistory(userId, threadId);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  // Convert Message type to simple format for ChatMessages component
  // Merge real messages with optimistic ones
  const chatMessages = [
    ...messages.map((msg: Message) => ({
      role: msg.role,
      content: msg.content || "",
      isOptimistic: false,
    })),
    ...optimisticMessages.map((msg: Message) => ({
      role: msg.role,
      content: msg.content || "",
      isOptimistic: true,
    }))
  ];

  const isBusy = isSending || isTranscribing;
  const hasText = input.trim().length > 0;
  const isEmptyThread = chatMessages.length === 0 && !isLoading && !isBusy;

  const handleSend = async () => {
    if (!input.trim() || isBusy || !userId) return;

    const messageContent = input.trim();
    setInput("");
    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
        id: tempId,
        role: 'user',
        content: messageContent,
        createdAt: new Date(),
        userId: userId,
        threadId: threadId || 'temp',
    };
    setOptimisticMessages(prev => [...prev, optimisticMsg]);

    try {
      const idToken = user ? await user.getIdToken() : "";
      
      const formData = new FormData();
      formData.append("message", messageContent);
      // Remove client-side userId reliance, let server verify token
      // formData.append("userId", userId); 
      formData.append("idToken", idToken);
      if (threadId) {
        formData.append("threadId", threadId);
      }
      formData.append("source", "text");

      const result = await submitUserMessage(formData);
      if (!result) {
        return;
      }
      
      if (result.threadId && !threadId) {
        setThreadId(result.threadId);
      }

      if (result.error) {
        console.error("Message error:", result.error);
        // Optionally keep optimistic message with error state or remove
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
      // Remove the optimistic message (assuming it's now in the real list or failed)
      // In a more robust impl, we'd wait for it to appear in real list
      setOptimisticMessages(prev => prev.filter(m => m.content !== messageContent));
    }
  };

  const handleVoiceSubmit = async (formData: FormData) => {
    if (!userId || !user) return;
    try {
      const idToken = await user.getIdToken();
      formData.append("idToken", idToken);
      if (threadId) {
        formData.append("threadId", threadId);
      }

      const result = await transcribeAndProcessMessage(formData);
      if (result?.threadId && !threadId) {
        setThreadId(result.threadId);
      }
    } catch (error) {
      console.error("Failed to send voice message:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-black text-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-black pb-40">
        {!isEmptyThread && (
          <ChatMessages 
            messages={chatMessages} 
            isLoading={isLoading || isSending} 
          />
        )}
      </div>

      {/* Floating Composer (video-like). Empty thread centers it; otherwise it docks to bottom. */}
      <div
        className={[
          "pointer-events-none absolute inset-x-0",
          isEmptyThread
            ? "top-1/2 -translate-y-1/2"
            : "bottom-0 pb-[calc(env(safe-area-inset-bottom)+24px)]",
        ].join(" ")}
      >
        <div className="pointer-events-auto mx-auto w-full max-w-[520px] px-4">
          <div className="flex items-end gap-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_0_24px_rgba(167,139,250,0.22)] px-3">
            <ChatInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Pandora…"
              disabled={isBusy || !userId}
            />

            {/* NON-NEGOTIABLE: mic ↔ send swap (value.trim().length) with fade+scale */}
            <AnimatePresence mode="wait" initial={false}>
              {hasText ? (
                <motion.button
                  key="send"
                  type="button"
                  onClick={handleSend}
                  disabled={isBusy || !userId}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="mb-1 p-3 rounded-full bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  aria-label="Send message"
                >
                  <ArrowUp className="w-5 h-5" />
                </motion.button>
              ) : (
                <motion.div
                  key="mic"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="mb-1"
                >
                  <VoiceInput
                    userId={userId || ""}
                    onTranscriptionStatusChange={setIsTranscribing}
                    disabled={isBusy || !userId}
                    onAudioSubmit={handleVoiceSubmit}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

