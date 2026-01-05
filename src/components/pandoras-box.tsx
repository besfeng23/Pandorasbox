'use client';

import { ChatMessages } from './chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { AlertCircle, Loader2, Menu, X, Settings, MemoryStick, FileCode, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useArtifactStore } from '@/store/artifacts';
import { ArtifactViewer } from './artifacts/artifact-viewer';
import { ArtifactList } from './artifacts/artifact-list';
import { MemoryInspector } from './layout/memory-inspector';
import { useChatHistory } from '@/hooks/use-chat-history';
import { useState, useEffect } from 'react';
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
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();

  // Load sidebar collapse state from localStorage
  useEffect(() => {
    if (!isMobile) {
      const leftCollapsed = localStorage.getItem('leftSidebarCollapsed') === 'true';
      const rightCollapsed = localStorage.getItem('rightSidebarCollapsed') === 'true';
      setLeftSidebarCollapsed(leftCollapsed);
      setRightSidebarCollapsed(rightCollapsed);
    }
  }, [isMobile]);

  // Save sidebar collapse state to localStorage
  const toggleLeftSidebar = () => {
    const newState = !leftSidebarCollapsed;
    setLeftSidebarCollapsed(newState);
    localStorage.setItem('leftSidebarCollapsed', String(newState));
  };

  const toggleRightSidebar = () => {
    const newState = !rightSidebarCollapsed;
    setRightSidebarCollapsed(newState);
    localStorage.setItem('rightSidebarCollapsed', String(newState));
  };

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
      <div className="p-3 border-b border-cyan-400/20">
        <Button 
          variant="ghost" 
          className={cn(
            "w-full glass-panel border-glow-cyan hover:bg-white/10 transition-all",
            leftSidebarCollapsed && "px-2"
          )}
          onClick={handleNewChat}
        >
          <PlusCircle className={cn("h-4 w-4", leftSidebarCollapsed ? "mx-auto" : "mr-2")} />
          {!leftSidebarCollapsed && <span>New Chat</span>}
        </Button>
      </div>
      {!leftSidebarCollapsed && (
        <ChatSidebar 
          userId={user.uid}
          activeThreadId={currentThreadId}
          onSelectThread={handleThreadSelect}
        />
      )}
    </>
  );

  return (
    <div className="h-screen w-full flex overflow-hidden safe-area-inset">
      {/* Mobile Menu Button */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 glass-panel-strong border-b border-cyan-400/20 safe-area-inset-top">
          <div className="flex items-center justify-between px-4 h-14">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-cyan-400 hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 glass-panel-strong border-r border-cyan-400/20">
                <SheetHeader className="p-4 border-b border-cyan-400/20">
                  <SheetTitle className="neon-text-cyan">Chats</SheetTitle>
                </SheetHeader>
                <div className="h-[calc(100vh-4rem)] overflow-y-auto">
                  {sidebarContent}
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold neon-text-cyan">Pandora</h1>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-cyan-400 hover:bg-white/10">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      {!isMobile && (
        <div className={cn(
          "border-r border-cyan-400/20 flex-col hidden lg:flex glass-panel transition-all duration-300 shadow-neon-cyan-sm",
          leftSidebarCollapsed ? "w-16" : "w-64"
        )}>
          <div className="p-3 border-b border-cyan-400/20 flex items-center justify-between">
            {!leftSidebarCollapsed && (
              <h2 className="font-semibold text-sm neon-text-cyan">Chats</h2>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Link href="/settings">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-cyan-400 hover:bg-white/10">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-cyan-400 hover:bg-white/10"
                onClick={toggleLeftSidebar}
              >
                {leftSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {sidebarContent}
        </div>
      )}

      {/* Main Chat Area */}
      <div className={cn(
        "flex flex-col flex-1 min-w-0",
        isMobile && "pt-14", // Account for mobile header
        !isMobile && !isSplitView && !rightSidebarCollapsed && "border-r border-cyan-400/20" // Add border when right sidebar is visible
      )}>
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center glass-panel z-10">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center glass-panel z-10 p-4">
              <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
              <p className="text-center text-red-400">{error}</p>
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

          {/* Input Area - Floating at bottom */}
          <div className="safe-area-inset-bottom">
            <div className={cn(
              "mx-auto p-3 sm:p-4 mb-4",
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
            <div className={cn(
              "border-l border-cyan-400/20 hidden lg:flex flex-col glass-panel transition-all duration-300 shadow-neon-purple-sm",
              rightSidebarCollapsed ? "w-16" : "w-96"
            )}>
              {rightSidebarCollapsed ? (
                <div className="p-2 border-b border-cyan-400/20">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-purple-400 hover:bg-white/10"
                    onClick={toggleRightSidebar}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="p-2 border-b border-cyan-400/20 flex items-center justify-between">
                    <span className="text-sm font-semibold neon-text-purple">Artifact</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-purple-400 hover:bg-white/10"
                      onClick={toggleRightSidebar}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <ArtifactViewer artifactId={activeArtifactId} />
                </>
              )}
            </div>
          ) : (
            <div className={cn(
              "border-l border-cyan-400/20 hidden lg:flex flex-col glass-panel transition-all duration-300 shadow-neon-purple-sm",
              rightSidebarCollapsed ? "w-16" : "w-80"
            )}>
              <Tabs defaultValue="memories" className="flex flex-col flex-1 h-full">
                <div className="p-2 border-b border-cyan-400/20 flex items-center justify-between">
                  {!rightSidebarCollapsed && (
                    <TabsList className="grid grid-cols-2 rounded-none bg-transparent p-0 h-10 flex-1">
                      <TabsTrigger 
                        value="memories" 
                        className="rounded-none border-r border-cyan-400/20 data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 data-[state=active]:neon-text-cyan flex items-center gap-2 text-xs"
                      >
                        <MemoryStick className="h-4 w-4" /> 
                        <span>Memories</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="artifacts" 
                        className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-purple-400 data-[state=active]:neon-text-purple flex items-center gap-2 text-xs"
                      >
                        <FileCode className="h-4 w-4" /> 
                        <span>Artifacts</span>
                      </TabsTrigger>
                    </TabsList>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-purple-400 hover:bg-white/10 ml-auto"
                    onClick={toggleRightSidebar}
                  >
                    {rightSidebarCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
                {!rightSidebarCollapsed && (
                  <>
                    <TabsContent value="memories" className="flex-1 p-0 mt-0 overflow-hidden">
                      <MemoryInspector userId={user.uid} />
                    </TabsContent>
                    <TabsContent value="artifacts" className="flex-1 p-0 mt-0 overflow-hidden">
                      <ArtifactList userId={user.uid} />
                    </TabsContent>
                  </>
                )}
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
