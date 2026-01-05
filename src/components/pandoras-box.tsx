'use client';

import { ChatMessages } from './chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { AlertCircle, Loader2, Menu, X, Settings, MemoryStick, FileCode } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useArtifactStore } from '@/store/artifacts';
import { ArtifactViewer } from './artifacts/artifact-viewer';
import { ArtifactList } from './artifacts/artifact-list';
import { MemoryInspector } from './layout/memory-inspector';
import { useChatHistory } from '@/hooks/use-chat-history';
import { useState } from 'react';
import { ChatSidebar } from './chat/chat-sidebar';
import { Button } from './ui/button';
import { submitUserMessage } from '@/app/actions';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import Link from 'next/link';

interface PandorasBoxProps {
  user: User;
}

export function PandorasBox({ user }: PandorasBoxProps) {
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const { messages, thread, isLoading, error } = useChatHistory(user.uid, currentThreadId);
  const activeArtifactId = useArtifactStore(state => state.activeArtifactId);
  const setActiveArtifactId = useArtifactStore(state => state.setActiveArtifactId);
  const isSplitView = !!activeArtifactId;
  const [isPending, startTransition] = useTransition();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleNewChat = () => {
    setCurrentThreadId(null);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleThreadSelect = (threadId: string) => {
    setCurrentThreadId(threadId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

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

  const sidebarContent = (
    <>
      <div className="p-3 border-b border-border">
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleNewChat}
        >
          New Chat
        </Button>
      </div>
      <ChatSidebar 
        userId={user.uid}
        activeThreadId={currentThreadId}
        onSelectThread={handleThreadSelect}
      />
    </>
  );

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background safe-area-inset">
      {/* Mobile Menu Button */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border safe-area-inset-top">
          <div className="flex items-center justify-between px-4 h-14">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle>Chats</SheetTitle>
                </SheetHeader>
                <div className="h-[calc(100vh-4rem)] overflow-y-auto">
                  {sidebarContent}
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold">Pandora</h1>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      {!isMobile && (
        <div className="w-64 border-r border-border bg-card flex-col hidden lg:flex">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Chats</h2>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {sidebarContent}
        </div>
      )}

      {/* Main Chat Area */}
      <div className={cn(
        "flex flex-col flex-1 min-w-0",
        isMobile && "pt-14", // Account for mobile header
        !isMobile && !isSplitView && "border-r border-border" // Add border when right sidebar is visible
      )}>
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
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <ChatMessages 
              messages={messages} 
              thread={thread} 
              userId={user.uid}
            />
          </div>

          {/* Input Area - Fixed at bottom */}
          <div className="border-t border-border bg-background safe-area-inset-bottom">
            <div className={cn(
              "mx-auto p-3 sm:p-4",
              isMobile ? "w-full px-3" : "max-w-3xl"
            )}>
              <ChatInput 
                userId={user.uid} 
                onMessageSubmit={handleMessageSubmit} 
                isSending={isPending} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Right Sidebar - Memories/Artifacts or Artifact Viewer */}
      {!isMobile && (
        <>
          {isSplitView && activeArtifactId ? (
            <div className="w-96 border-l border-border bg-card hidden lg:flex flex-col">
              <ArtifactViewer artifactId={activeArtifactId} />
            </div>
          ) : (
            <div className="w-80 border-l border-border bg-card hidden lg:flex flex-col">
              <Tabs defaultValue="memories" className="flex flex-col flex-1 h-full">
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border bg-card p-0 h-12">
                  <TabsTrigger 
                    value="memories" 
                    className="rounded-none border-r border-border data-[state=active]:border-b-2 data-[state=active]:border-primary flex items-center gap-2"
                  >
                    <MemoryStick className="h-4 w-4" /> Memories
                  </TabsTrigger>
                  <TabsTrigger 
                    value="artifacts" 
                    className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary flex items-center gap-2"
                  >
                    <FileCode className="h-4 w-4" /> Artifacts
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="memories" className="flex-1 p-0 mt-0 overflow-hidden">
                  <MemoryInspector userId={user.uid} />
                </TabsContent>
                <TabsContent value="artifacts" className="flex-1 p-0 mt-0 overflow-hidden">
                  <ArtifactList userId={user.uid} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </>
      )}

      {/* Mobile Artifact Modal */}
      {isMobile && activeArtifactId && (
        <Dialog open={!!activeArtifactId} onOpenChange={(open) => !open && setActiveArtifactId(null)}>
          <DialogContent className="max-w-[95vw] h-[90vh] p-0 flex flex-col">
            <DialogHeader className="px-4 py-3 border-b border-border flex-shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <span>Artifact</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveArtifactId(null)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <ArtifactViewer artifactId={activeArtifactId} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
