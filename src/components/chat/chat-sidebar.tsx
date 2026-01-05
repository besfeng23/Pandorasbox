
'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { getUserThreads } from '@/app/actions';
import { Thread } from '@/lib/types';
import { Loader2, MessageSquare, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';

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
          threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={cn(
                'w-full text-left p-3 rounded-lg transition-all flex flex-col gap-1 touch-manipulation min-h-[44px] group relative',
                activeThreadId === thread.id 
                  ? 'glass-panel border border-cyan-400/30 shadow-neon-cyan-sm' 
                  : 'glass-panel border border-transparent hover:border-cyan-400/20 hover:bg-white/5'
              )}
              title={thread.title} // Tooltip for truncated text
            >
              <div className="flex items-start gap-2">
                {activeThreadId === thread.id ? (
                  <MessageCircle className="h-4 w-4 mt-0.5 shrink-0 text-cyan-400" />
                ) : (
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-white/40 group-hover:text-cyan-400/60 transition-colors" />
                )}
                <p className={cn(
                  "text-sm flex-1 pr-4 font-medium",
                  activeThreadId === thread.id 
                    ? "neon-text-cyan truncate" 
                    : "text-white/90 truncate group-hover:text-cyan-400/80"
                )}>
                  {thread.title}
                </p>
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
          ))
        )}
      </div>
    </ScrollArea>
  );
}
