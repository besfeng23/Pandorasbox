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
import { ChatInput } from './chat/chat-input';
import { ChatMessages } from './chat/chat-messages';
import { useChatHistory } from '@/hooks/use-chat-history';
import { AlertCircle, FileCode, Loader2, MemoryStick } from 'lucide-react';
import type { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { useArtifactStore } from '@/store/artifacts';
import { ArtifactViewer } from './artifacts/artifact-viewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArtifactList } from './artifacts/artifact-list';


interface PandorasBoxProps {
  user: User;
}

export function PandorasBox({ user }: PandorasBoxProps) {
  const { messages, isLoading: isHistoryLoading, error } = useChatHistory(user.uid);
  const activeArtifactId = useArtifactStore(state => state.activeArtifactId);
  const isSplitView = !!activeArtifactId;

  return (
    <SidebarProvider>
      <div className="h-screen w-full flex overflow-hidden bg-background text-foreground font-body antialiased">
        <Sidebar collapsible="icon" className="bg-surface/50 dark:bg-card">
          <CommandRail />
        </Sidebar>

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
            
            <div className="flex-1 overflow-y-auto relative chat-container">
                {isHistoryLoading && (
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
                <ChatMessages messages={messages} />
            </div>
            
            <div className="w-full p-4 bg-background/80 dark:bg-zinc-950/80 backdrop-blur-md border-t pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <ChatInput userId={user.uid} />
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
                <ArtifactViewer artifactId={activeArtifactId} />
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
