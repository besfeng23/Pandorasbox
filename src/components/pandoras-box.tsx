
'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { CommandRail } from '@/components/layout/command-rail';
import { MemoryInspector } from '@/components/layout/memory-inspector';
import { ChatMessages } from './chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { AlertCircle, FileCode, Loader2, MemoryStick, MessageSquare, Plus } from 'lucide-react';
import type { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { useArtifactStore } from '@/store/artifacts';
import { ArtifactViewer } from './artifacts/artifact-viewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArtifactList } from './artifacts/artifact-list';
import { useChatHistory } from '@/hooks/use-chat-history';
import { useState } from 'react';
import { ChatSidebar } from './chat/chat-sidebar';
import { Button } from './ui/button';
import { submitUserMessage } from '@/app/actions';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';


interface PandorasBoxProps {
  user: User;
}

export function PandorasBox({ user }: PandorasBoxProps) {
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const { messages, thread, isLoading, error } = useChatHistory(user.uid, currentThreadId);
  const activeArtifactId = useArtifactStore(state => state.activeArtifactId);
  const isSplitView = !!activeArtifactId;
  const [isPending, startTransition] = useTransition();

  const handleNewChat = () => {
    setCurrentThreadId(null);
  }

  const handleMessageSubmit = (formData: FormData) => {
    if (currentThreadId) {
        formData.append('threadId', currentThreadId);
    }
    
    startTransition(async () => {
        const result = await submitUserMessage(formData);
        if (result?.threadId && !currentThreadId) {
            setCurrentThreadId(result.threadId);
        }
    });
    return isPending;
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* Left Sidebar - ChatGPT style */}
      <div className="w-64 border-r border-border bg-card flex-col hidden lg:flex">
        <div className="p-3 border-b border-border">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleNewChat}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
        <ChatSidebar 
          userId={user.uid}
          activeThreadId={currentThreadId}
          onSelectThread={setCurrentThreadId}
        />
      </div>

      {/* Main Chat Area - ChatGPT style */}
      <div className={cn("flex flex-col flex-1 min-w-0", isSplitView && "border-r border-border")}>
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 z-10 p-4">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-center text-destructive">{error}</p>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto">
            <ChatMessages 
              messages={messages} 
              thread={thread} 
              userId={user.uid}
            />
          </div>

          {/* Input Area - Fixed at bottom like ChatGPT */}
          <div className="border-t border-border bg-background">
            <div className="max-w-3xl mx-auto p-4">
              <ChatInput 
                userId={user.uid} 
                onMessageSubmit={handleMessageSubmit} 
                isSending={isPending} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Artifact Viewer */}
      {isSplitView && activeArtifactId && (
        <div className="w-96 border-l border-border bg-card hidden lg:flex flex-col">
          <ArtifactViewer artifactId={activeArtifactId} />
        </div>
      )}
    </div>
  );
}
