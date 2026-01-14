"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Loader2, Paperclip } from "lucide-react";
import ChatMessages from "@/app/(pandora-ui)/components/ChatMessages";
import ChatInput from "@/app/(pandora-ui)/components/ChatInput";
import { submitUserMessage, transcribeAndProcessMessage } from "@/app/actions";
import { useChatHistory } from "@/hooks/use-chat-history";
import { useUser, useFirestore } from "@/firebase";
import { createThreadAuthed } from "@/app/actions";
import { Message } from "@/lib/types";
import { VoiceInput } from "@/components/chat/voice-input";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { doc, onSnapshot } from "firebase/firestore";

function PandoraChatPageContent() {
  const { user } = useUser();
  const userId = user?.uid || null;
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firestore = useFirestore();
  const searchParams = useSearchParams();

  // Initialize thread on mount and when searchParams change
  useEffect(() => {
    const paramThreadId = searchParams.get("threadId");
    
    // If URL has threadId, use it
    if (paramThreadId) {
      if (paramThreadId !== threadId) {
        setThreadId(paramThreadId);
      }
      return;
    }

    // Only create a new thread if we don't have one and user is available
    if (user && userId && !threadId) {
      user
        .getIdToken()
        .then((token) => createThreadAuthed(token))
        .then((newThreadId) => {
          setThreadId(newThreadId);
          // Update URL without creating navigation entry
          const url = new URL(window.location.href);
          url.searchParams.set("threadId", newThreadId);
          window.history.replaceState({}, "", url);
        })
        .catch(console.error);
    }
  }, [user, userId, searchParams, threadId]);

  // Fetch real-time messages using the existing hook
  const { messages, isLoading, thread } = useChatHistory(userId, threadId);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  // Load follow-up suggestions
  useEffect(() => {
    if (!user?.uid || !firestore) return;
    const suggestionsRef = doc(firestore, 'users', user.uid, 'state', 'suggestions');
    const unsubscribe = onSnapshot(suggestionsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setFollowUpSuggestions(data.suggestions || []);
      } else {
        setFollowUpSuggestions([]);
      }
    });
    return () => unsubscribe();
  }, [user?.uid, firestore]);

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

    // Show neon ripple effect
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 600);

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
        <div className="flex-1 flex items-center justify-center px-4 circuit-texture">
          <div className="w-full max-w-2xl text-center space-y-6">
            <div className="mx-auto h-24 w-24 rounded-2xl gradient-border overflow-hidden bg-card/40 flex items-center justify-center">
              <img src="/cube2.png" alt="Pandora" className="h-20 w-20 object-cover" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold gradient-text-cyan mb-2">Pandora</h1>
              <p className="text-sm text-muted-foreground">
                Ask anything. Your workspaces, memories, and evidence stay connected.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ChatMessages messages={chatMessages} isLoading={isLoading || isSending} />
          {thread?.summary && (
            <div className="mx-auto w-full max-w-3xl px-4 pb-4">
              <div className="rounded-xl border border-primary/20 bg-card/40 glass-panel p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-medium text-primary">Thread Summary</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{thread.summary}</p>
              </div>
            </div>
          )}
          {followUpSuggestions.length > 0 && (
            <div className="mx-auto w-full max-w-3xl px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {followUpSuggestions.map((suggestion, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Composer (ChatGPT-like pinned bottom) - Enhanced with frosted glass and neon styling */}
      <div className="sticky bottom-0 border-t border-primary/20 glass-panel-strong pb-[calc(env(safe-area-inset-bottom)+8px)] shadow-2xl bg-gradient-to-t from-background via-background/95 to-background/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl px-4 pt-4">
          <div className={[
            "flex items-end gap-2 rounded-2xl border-2 border-primary/30 bg-card/60 px-4 py-3 ring-2 ring-primary/20 hover:ring-primary/40 hover:border-primary/50 transition-all shadow-xl shadow-primary/10 relative overflow-hidden",
            showRipple ? "energy-burst" : "",
            "hover:shadow-2xl hover:shadow-primary/20"
          ].join(" ")}>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,.pdf,.txt,.md"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Handle file upload - for now just show a message
                  console.log("File selected:", file.name);
                  // TODO: Implement file upload
                }
              }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 hover:bg-primary/20 hover:text-primary transition-all rounded-lg border border-transparent hover:border-primary/30"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy || !userId}
                  aria-label="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach file</p>
              </TooltipContent>
            </Tooltip>
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
                  onClick={(e) => {
                    handleSend();
                    // Add energy burst effect
                    e.currentTarget.classList.add('energy-burst');
                    setTimeout(() => {
                      e.currentTarget.classList.remove('energy-burst');
                    }, 600);
                  }}
                  disabled={isBusy || !userId}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="mb-1 p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 neon-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Send message"
                  data-testid="chat-send"
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
                  data-testid="chat-mic-container"
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

export default function PandoraChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PandoraChatPageContent />
    </Suspense>
  );
}

