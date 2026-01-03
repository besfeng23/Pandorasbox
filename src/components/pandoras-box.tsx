
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
import { ChatCanvas } from './canvas/ChatCanvas';
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
    <SidebarProvider>
      <div className="h-screen w-full flex overflow-hidden bg-background text-foreground font-body antialiased">
        <Sidebar collapsible="icon" className="bg-surface/50 dark:bg-card">
          <CommandRail />
        </Sidebar>

        <div className="w-64 border-r bg-card flex-col hidden lg:flex">
            <div className="p-2 border-b">
                <Button variant="outline" className="w-full" onClick={handleNewChat}>
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

        <motion.div 
            className="flex flex-col flex-1 min-w-0"
            animate={{ width: isSplitView ? '40%' : '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        >
            <SidebarInset className="flex flex-col">
            <header className="flex items-center gap-2 p-2 border-b lg:hidden">
                <SidebarTrigger />
                <h1 className="text-lg font-semibold tracking-tight">PandorasBox</h1>
            </header>
            
            <div className="flex-1 overflow-hidden relative">
                {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                )}
                {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10 p-4">
                    <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                    <p className="text-center text-destructive">{error}</p>
                </div>
                )}

                {!currentThreadId && !isLoading ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mb-4" strokeWidth={1.5}/>
                        <h2 className="text-xl font-semibold">Start a new conversation</h2>
                        <p>Your chat history will be saved in threads.</p>
                    </div>
                ) : (
                    <ChatCanvas 
                        messages={messages} 
                        thread={thread} 
                        userId={user.uid}
                        onMessageSubmit={handleMessageSubmit}
                        isSending={isPending}
                    />
                )}
            </div>
            </SidebarInset>
        </motion.div>
        
        <AnimatePresence>
        {isSplitView ? (
             <motion.div 
                className="flex-1 min-w-0 h-full"
                initial={{ width: '0%', opacity: 0 }}
                animate={{ width: '60%', opacity: 1 }}
                exit={{ width: '0%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
             >
                <ArtifactViewer artifactId={activeArtifactId!} />
             </motion.div>
        ) : (
            <Sidebar side="right" collapsible="offcanvas" className="hidden lg:flex w-96 border-l bg-surface/50 dark:bg-card">
                 <Tabs defaultValue="memory" className="h-full w-full flex flex-col">
                    <SidebarHeader className="flex-col !items-stretch">
                        <h2 className="text-lg font-semibold tracking-tight p-2">Live Inspector</h2>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="memory"><MemoryStick className="w-4 h-4 mr-2"/> Memory</TabsTrigger>
                            <TabsTrigger value="artifacts"><FileCode className="w-4 h-4 mr-2"/> Artifacts</TabsTrigger>
                        </TabsList>
                    </SidebarHeader>
                    <SidebarContent className="p-0">
                        <TabsContent value="memory" className="m-0 h-full">
                            <MemoryInspector userId={user.uid} />
                        </TabsContent>
                        <TabsContent value="artifacts" className="m-0 h-full">
                             <ArtifactList userId={user.uid} />
                        </TabsContent>
                    </SidebarContent>
                 </Tabs>
            </Sidebar>
        )}
        </AnimatePresence>

      </div>
    </SidebarProvider>
  );
}
