
'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { getUserThreads } from '@/app/actions';
import { Thread } from '@/lib/types';
import { Loader2, MessageSquare, MessageCircle, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ThreadMenu } from './thread-menu';

interface ChatSidebarProps {
  userId: string;
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
}

export function ChatSidebar({ userId, activeThreadId, onSelectThread }: ChatSidebarProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const userThreads = await getUserThreads(userId);
      setThreads(userThreads);
    });
  }, [userId, activeThreadId]); // Re-fetch when activeThreadId changes to get new titles

  return (
    <TooltipProvider>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-full p-8">
              <Loader2 className="animate-spin text-cyan-400" />
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center text-sm text-white/60 p-4 glass-panel rounded-lg border border-cyan-400/10">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 text-cyan-400/50" />
              <p>No chats yet. Start a new conversation!</p>
            </div>
          ) : (
            threads
              .filter(thread => !thread.archived) // Filter out archived threads for now
              .map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  'w-full rounded-lg transition-all duration-200 flex flex-col gap-1 touch-manipulation min-h-[44px] group relative',
                  activeThreadId === thread.id 
                    ? 'glass-panel border border-cyan-400/30 shadow-neon-cyan-sm' 
                    : 'glass-panel border border-transparent hover:border-cyan-400/20 hover:bg-white/5'
                )}
              >
                <button
                  onClick={() => onSelectThread(thread.id)}
                  className="w-full text-left p-3 flex flex-col gap-1"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                      {thread.pinned && (
                        <Pin className="h-3 w-3 text-cyan-400/70" fill="currentColor" />
                      )}
                      {activeThreadId === thread.id ? (
                        <MessageCircle className="h-4 w-4 mt-0.5 text-cyan-400" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mt-0.5 text-white/40 group-hover:text-cyan-400/60 transition-colors" />
                      )}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className={cn(
                          "text-sm flex-1 pr-4 font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0",
                          activeThreadId === thread.id 
                            ? "neon-text-cyan" 
                            : "text-white/90 group-hover:text-cyan-400/80"
                        )}>
                          {thread.title}
                        </p>
                      </TooltipTrigger>
                      {thread.title.length > 30 && (
                        <TooltipContent className="glass-panel-strong border border-cyan-400/30 text-white max-w-xs">
                          <p>{thread.title}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                  <p className={cn(
                    "text-xs pl-6",
                    activeThreadId === thread.id 
                      ? "text-cyan-400/70" 
                      : "text-white/40 group-hover:text-white/60"
                  )}>
                    {formatDistanceToNow(new Date(thread.createdAt as any), { addSuffix: true })}
                  </p>
                </button>
                <div className="absolute top-2 right-2">
                  <ThreadMenu
                    threadId={thread.id}
                    userId={userId}
                    pinned={thread.pinned}
                    archived={thread.archived}
                    onDeleted={() => {
                      startTransition(async () => {
                        const userThreads = await getUserThreads(userId);
                        setThreads(userThreads);
                      });
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}
