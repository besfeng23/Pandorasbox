
'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { getUserThreads } from '@/app/actions';
import { Thread } from '@/lib/types';
import { Loader2, MessageSquare } from 'lucide-react';
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
        <div className="p-2 space-y-1">
        {isLoading ? (
            <div className="flex justify-center items-center h-full p-8">
                <Loader2 className="animate-spin" />
            </div>
        ) : threads.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground p-4">
                No chats yet. Start a new conversation!
            </div>
        ) : (
            threads.map((thread) => (
            <button
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={cn(
                'w-full text-left p-2 rounded-md hover:bg-muted transition-colors flex flex-col gap-1',
                activeThreadId === thread.id && 'bg-muted'
                )}
            >
                <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <p className="font-semibold text-sm truncate flex-1 pr-4">{thread.title}</p>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                    {formatDistanceToNow(new Date(thread.createdAt as any), { addSuffix: true })}
                </p>
            </button>
            ))
        )}
        </div>
    </ScrollArea>
  );
}
