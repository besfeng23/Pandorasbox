"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: string;
  content: string;
  status?: "processing" | "complete" | "error" | string;
  progress_log?: string[];
  isOptimistic?: boolean;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

export default function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const normalized = useMemo(() => {
    return messages.map((m) => {
      const isAssistant = m.role !== "user";
      const isProcessing = isAssistant && (m.status === "processing" || !m.content?.trim());
      const lastProgress =
        Array.isArray(m.progress_log) && m.progress_log.length > 0
          ? m.progress_log[m.progress_log.length - 1]
          : null;
      return { ...m, isAssistant, isProcessing, lastProgress };
    });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    const el = bottomRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nearBottom = rect.bottom - window.innerHeight < 220;
    if (nearBottom) {
      el.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [messages.length]);

  if (messages.length === 0 && !isLoading) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {normalized.map((m) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={m.isAssistant ? "flex gap-3 py-4" : "flex justify-end py-4"}
        >
          {m.isAssistant ? (
            <div className="mt-1 h-8 w-8 rounded-full border border-border bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
              <img src="/cube2.png" alt="Pandora" className="h-8 w-8 object-cover" />
            </div>
          ) : null}

          <div className={m.isAssistant ? "min-w-0 flex-1" : "max-w-[85%]"}>
            <div
              className={[
                "rounded-2xl px-4 py-3 border",
                m.isAssistant ? "bg-card/40 border-border" : "bg-muted/40 border-border",
                m.isOptimistic ? "opacity-70" : "",
              ].join(" ")}
            >
              {m.isAssistant && m.isProcessing ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-sm text-foreground">Thinking…</div>
                    {m.lastProgress ? (
                      <div className="text-xs text-muted-foreground truncate">{m.lastProgress}</div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                >
                  {m.content}
                </ReactMarkdown>
              )}
            </div>

            {m.isOptimistic ? (
              <div className="mt-2 text-xs text-muted-foreground text-right">(sending…)</div>
            ) : null}
          </div>
        </motion.div>
      ))}

      {isLoading ? (
        <div className="flex gap-3 py-4">
          <div className="mt-1 h-8 w-8 rounded-full border border-border bg-muted/30" />
          <div className="flex-1">
            <div className="rounded-2xl border border-border bg-card/40 px-4 py-3 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Thinking…</span>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}


