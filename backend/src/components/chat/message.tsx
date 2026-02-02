import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message as MessageType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot, Cog, RefreshCw, Loader2, Globe, Sparkles, Volume2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { ArtifactViewer } from './artifact-viewer';

function ToolIoDisplay({ data }: { data: any }) {
  if (typeof data !== 'object' || data === null) {
    return <p className="text-sm">{String(data)}</p>;
  }

  return (
    <div className="space-y-1">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <span className="font-semibold text-foreground/80">{key}:</span>
          <span className="break-all text-foreground/90">{JSON.stringify(value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Message({
  message,
  onRegenerate,
  isLastAssistantMessage,
  isRegenerating,
  onSpeak,
}: {
  message: MessageType,
  onRegenerate?: () => void,
  isLastAssistantMessage?: boolean,
  isRegenerating?: boolean,
  onSpeak?: () => void
}) {
  const isUser = message.role === 'user';
  const hasMemoryRecall = !isUser && message.toolUsages?.some(t => t.toolName.includes('memory'));

  // Defensive: Ensure content is always a string
  const safeContent = message.content || '';
  const hasContent = safeContent.trim().length > 0;
  const isErrorState = !hasContent && message.role === 'assistant' && !isLastAssistantMessage;

  // Typewriter Effect Logic
  const [displayedContent, setDisplayedContent] = React.useState(isLastAssistantMessage ? '' : safeContent);

  React.useEffect(() => {
    if (!isLastAssistantMessage) {
      setDisplayedContent(safeContent);
      return;
    }

    // Only run typewriter if we have content
    if (!safeContent || safeContent.length === 0) {
      setDisplayedContent('');
      return;
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < safeContent.length) {
        setDisplayedContent(safeContent.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 10); // 10ms speed for smooth typing

    return () => clearInterval(interval);
  }, [safeContent, isLastAssistantMessage]);

  return (
    <div className="group/message">
      <div className={cn('flex items-start gap-4', isUser ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'flex-1 transition-all duration-300',
            isUser
              ? 'script-user bg-transparent'
              : 'script-assistant bg-transparent relative'
          )}
        >
          {!isUser && (
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-primary stroke-[1]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/20">Assistant</span>
            </div>
          )}
          {isUser && (
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-foreground/20 stroke-[1]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/20">User</span>
            </div>
          )}
          {hasMemoryRecall && (
            <div className="absolute -top-3 left-4 px-2 py-0.5 rounded-none bg-primary/[0.03] border border-primary/10 flex items-center gap-1.5 underline decoration-primary/20 underline-offset-4">
              <Sparkles className="h-3 w-3 text-primary stroke-[1]" />
              <span className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.4em]">Memory Substrate Linked</span>
            </div>
          )}
          {isUser ? (
            <p className="text-base whitespace-pre-wrap leading-relaxed">
              {safeContent || <span className="text-muted-foreground italic">Empty message</span>}
            </p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
              {hasContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {displayedContent}
                </ReactMarkdown>
              ) : (
                <div className="flex items-center gap-2 text-destructive-foreground/80 py-2">
                  <Cog className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {isErrorState || message.isError
                      ? 'Error: No response from AI. The inference server may be offline or unreachable. Check your VPC connector configuration.'
                      : 'Waiting for response...'}
                  </span>
                </div>
              )}
            </div>
          )}
          {(message.isError || isErrorState) && hasContent && (
            <p className="mt-2 text-xs text-destructive-foreground/80">Could not generate response.</p>
          )}
          {message.toolUsages && message.toolUsages.length > 0 && (
            <div className="mt-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-b-0">
                  <AccordionTrigger className="text-xs hover:no-underline p-2 rounded-md hover:bg-white/10">
                    <div className="flex items-center gap-2">
                      <Cog className="h-4 w-4" />
                      <span>View Agent Reasoning</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 p-4 border border-border/5 rounded-xl mt-2 overflow-hidden relative">
                      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none"></div>
                      {message.toolUsages.map((tool, index) => {
                        const isReasoning = tool.toolName === 'Reasoning Engine';

                        return (
                          <div key={index} className={cn(
                            "relative group/tool p-3 rounded-none border transition-all duration-300",
                            isReasoning
                              ? "bg-primary/[0.03] border-primary/20 shadow-none"
                              : "bg-foreground/[0.02] border-foreground/5"
                          )}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "p-1.5 rounded-none",
                                  isReasoning ? "bg-primary/10 text-primary" : "bg-foreground/5 text-muted-foreground"
                                )}>
                                  {isReasoning ? <Sparkles className="h-4 w-4 stroke-[1]" /> : <Cog className="h-4 w-4 stroke-[1]" />}
                                </div>
                                <span className="font-bold text-[10px] uppercase tracking-[0.4em] tabular-nums text-foreground/40">
                                  {isReasoning ? "Cognition Subsystem" : tool.toolName}
                                </span>
                              </div>
                              {isReasoning && (
                                <div className="text-[10px] font-mono text-primary/60 border border-primary/20 px-1.5 py-0.5 rounded">
                                  CONFIDENCE: {(tool.output?.confidence * 100).toFixed(0)}%
                                </div>
                              )}
                            </div>

                            {isReasoning ? (
                              <div className="space-y-3">
                                <div className="p-2.5 bg-background/40 rounded-none border border-foreground/5 italic text-sm text-foreground/70 leading-relaxed">
                                  "{tool.output?.thinking}"
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {tool.output?.steps?.map((step: string, sIdx: number) => (
                                    <div key={sIdx} className="flex items-center gap-2 text-[10px] font-medium bg-white/5 px-2 py-1 rounded border border-white/5 text-muted-foreground transition-colors hover:border-primary/30">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                                      {step}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Input</p>
                                  <div className="p-2 bg-black/20 rounded text-[11px] font-mono overflow-x-auto whitespace-pre">
                                    {JSON.stringify(tool.input, null, 2)}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Output</p>
                                  <div className="p-2 bg-black/20 rounded text-[11px] font-mono overflow-x-auto whitespace-pre">
                                    {JSON.stringify(tool.output, null, 2)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </div>
      </div>
      {isLastAssistantMessage && (onRegenerate || onSpeak) && (
        <div className={cn('flex pt-2 gap-2 transition-opacity group-hover/message:opacity-100', isRegenerating ? 'opacity-100' : 'opacity-0', isUser ? 'justify-end' : 'justify-start pl-12')}>
          {onRegenerate && (
            <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isRegenerating}>
              {isRegenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Regenerate
            </Button>
          )}
          {onSpeak && (
            <Button variant="ghost" size="sm" onClick={onSpeak} className="text-muted-foreground hover:text-foreground">
              <Volume2 className="h-4 w-4 mr-2" />
              Read Aloud
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
