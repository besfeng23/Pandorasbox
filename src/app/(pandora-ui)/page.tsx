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
      id: msg.id,
      role: msg.role,
      content: msg.content || "",
      status: msg.status,
      progress_log: msg.progress_log,
      isOptimistic: false,
    })),
    ...optimisticMessages.map((msg: Message) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content || "",
      status: msg.status,
      progress_log: msg.progress_log,
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
    <div className="flex flex-col min-h-full">
      {/* Empty hero */}
      {isEmptyThread ? (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-2xl text-center">
            <div className="mx-auto h-20 w-20 rounded-2xl border border-border bg-card/40 overflow-hidden">
              <img src="/cube2.png" alt="Pandora" className="h-20 w-20 object-cover" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-foreground">Pandora</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask anything. Your workspaces, memories, and evidence stay connected.
            </p>
          </div>
        </div>
      ) : (
        <ChatMessages messages={chatMessages} isLoading={isLoading || isSending} />
      )}

      {/* Composer (ChatGPT-like pinned bottom) */}
      <div className="sticky bottom-0 border-t border-border bg-background/70 backdrop-blur-sm pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <div className="mx-auto w-full max-w-3xl px-4 pt-4">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-card/30 px-3 py-2">
            <ChatInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message Pandora…"
              disabled={isBusy || !userId}
            />

            {/* MIC ↔ SEND swap (kept; will be refined in elite polish) */}
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
                  className="mb-1 p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Pandora can make mistakes. Verify important info.
          </div>
        </div>
      </div>
    </div>
  );
}

