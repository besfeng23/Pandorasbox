"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Copy, Check, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatMessageTime, formatFullDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Message {
  id: string;
  role: string;
  content: string;
  status?: "processing" | "complete" | "error" | string;
  progress_log?: string[];
  isOptimistic?: boolean;
  createdAt?: Date | string | any;
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
      const isProcessing = isAssistant && (m.status === "processing" || (!m.content?.trim() && m.status !== "error"));
      const isError = m.status === "error";
      const lastProgress =
        Array.isArray(m.progress_log) && m.progress_log.length > 0
          ? m.progress_log[m.progress_log.length - 1]
          : null;
      
      // Check if message has been processing for too long (client-side timeout)
      const createdAt = m.createdAt ? new Date(m.createdAt) : null;
      const isStuck = isProcessing && createdAt && (Date.now() - createdAt.getTime()) > 120000; // 2 minutes
      
      return { ...m, isAssistant, isProcessing: isProcessing && !isStuck, isError: isError || isStuck, lastProgress, isStuck };
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
      {normalized.map((m) => {
        const timestamp = m.createdAt ? formatMessageTime(m.createdAt) : '';
        const fullTimestamp = m.createdAt ? formatFullDateTime(m.createdAt) : '';
        return (
        <MessageCard key={m.id} message={m} timestamp={timestamp} fullTimestamp={fullTimestamp} />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageCard({ message: m, timestamp, fullTimestamp }: { message: any; timestamp: string; fullTimestamp: string }) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleCopy = async () => {
    if (!m.content) return;
    await navigator.clipboard.writeText(m.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={[
            m.isAssistant ? "flex gap-3 py-4 group" : "flex justify-end py-4 group",
            m.isOptimistic ? "energy-burst" : ""
          ].join(" ")}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
      {m.isAssistant ? (
        <div className="mt-1 h-8 w-8 rounded-full border border-primary/30 bg-muted/30 overflow-hidden flex items-center justify-center shrink-0 ring-1 ring-primary/10">
          <img src="/cube2.png" alt="Pandora" className="h-8 w-8 object-cover" />
        </div>
      ) : (
        <div className="mt-1 h-8 w-8 rounded-full border border-border/50 bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>
      )}

      <div className={m.isAssistant ? "min-w-0 flex-1" : "max-w-[85%]"}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {m.isAssistant ? "Pandora" : "You"}
          </span>
          {timestamp && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground/70 cursor-help">{timestamp}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{fullTimestamp}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
            <div
              className={[
                "rounded-2xl px-4 py-3 border relative glass-panel",
                m.isAssistant 
                  ? "border-border/50 ring-1 ring-primary/5" 
                  : "border-primary/20 ring-1 ring-primary/10",
                m.isOptimistic ? "opacity-70" : "",
              ].join(" ")}
            >
          {showActions && !m.isProcessing && !m.isError && m.content && (
            <div className="absolute -top-8 right-0 flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? "Copied!" : "Copy message"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          
          {m.isAssistant && m.isProcessing ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <div className="min-w-0">
                <div className="text-sm text-foreground">Thinking…</div>
                {m.lastProgress ? (
                  <div className="text-xs text-muted-foreground truncate">{m.lastProgress}</div>
                ) : null}
              </div>
            </div>
          ) : m.isError || m.isStuck ? (
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full bg-destructive" />
              <div className="min-w-0">
                <div className="text-sm text-destructive">
                  {m.isStuck ? "Response timed out. Please try again." : m.content || "An error occurred."}
                </div>
              </div>
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="prose prose-sm dark:prose-invert max-w-none leading-relaxed [&_pre]:bg-background/80 [&_pre]:border [&_pre]:border-border/50 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:bg-background/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm"
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
  );
}

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


