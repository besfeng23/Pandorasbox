
'use client';

import React, { useEffect, useState, useTransition, useMemo } from 'react';
import { getUserThreads } from '@/app/actions';
import { Thread } from '@/lib/types';
import { Loader2, MessageSquare, MessageCircle, Pin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';
import { ThreadMenu } from './thread-menu';
import { Input } from '../ui/input';

interface ChatSidebarProps {
  userId: string;
  activeThreadId: string | null;
  agentId: string; // Add agentId prop
  onSelectThread: (threadId: string) => void;
}

export function ChatSidebar({ userId, activeThreadId, agentId, onSelectThread }: ChatSidebarProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const userThreads = await getUserThreads(userId, agentId); // Pass agentId
      setThreads(userThreads);
    });
  }, [userId, activeThreadId, agentId]); // Re-fetch when activeThreadId or agentId changes

  // Filter threads based on search query
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) {
      return threads.filter(thread => !thread.archived);
    }

    const query = searchQuery.toLowerCase();
    return threads.filter(thread =>
      !thread.archived &&
      (thread.title || thread.name || '').toLowerCase().includes(query)
    );
  }, [threads, searchQuery]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Search bar */}
        <div className="p-2 border-b border-primary/20">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-background/50 border-input text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="flex justify-center items-center h-full p-8">
                <Loader2 className="animate-spin text-primary" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground p-4 glass-panel rounded-lg border border-primary/10">
                <MessageSquare className="h-6 w-6 mx-auto mb-2 text-primary/50" />
                <p>{searchQuery ? 'No threads found' : 'No chats yet. Start a new conversation!'}</p>
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  className={cn(
                    'w-full rounded-lg transition-all duration-200 flex flex-col gap-1 touch-manipulation min-h-[44px] group relative',
                    activeThreadId === thread.id
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <button
                    onClick={() => onSelectThread(thread.id)}
                    className="w-full text-left p-3 flex flex-col gap-1"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 shrink-0">
                        {thread.pinned && (
                          <Pin className="h-3 w-3 text-primary/70" fill="currentColor" />
                        )}
                        {activeThreadId === thread.id ? (
                          <MessageCircle className="h-4 w-4 mt-0.5 text-primary" />
                        ) : (
                          <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary/60 transition-colors" />
                        )}
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className={cn(
                            "text-sm flex-1 pr-4 font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0",
                            activeThreadId === thread.id
                              ? "text-primary"
                              : "text-foreground group-hover:text-primary/80"
                          )}>
                            {thread.title || thread.name}
                          </p>
                        </TooltipTrigger>
                        {(thread.title || thread.name || '').length > 30 && (
                          <TooltipContent className="glass-panel-strong border border-primary/30 text-foreground max-w-xs">
                            <p>{thread.title || thread.name}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>
                    <p className={cn(
                      "text-xs pl-6",
                      activeThreadId === thread.id
                        ? "text-primary/70"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {formatDistanceToNow(new Date(thread.createdAt as any), { addSuffix: true })}
                    </p>
                  </button>
                  <div className="absolute top-2 right-2">
                    <ThreadMenu
                      threadId={thread.id}
                      userId={userId}
                      agentId={agentId} // Pass agentId
                      threadTitle={thread.title || thread.name}
                      pinned={thread.pinned}
                      archived={thread.archived}
                      onRename={() => {
                        startTransition(async () => {
                          const userThreads = await getUserThreads(userId, agentId); // Pass agentId
                          setThreads(userThreads);
                        });
                      }}
                      onDeleted={() => {
                        startTransition(async () => {
                          const userThreads = await getUserThreads(userId, agentId); // Pass agentId
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
      </div>
    </TooltipProvider>
  );
}
