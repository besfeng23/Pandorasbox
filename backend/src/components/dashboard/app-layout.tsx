
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useAuthActions } from '@/firebase';
import type { Thread } from '@/lib/types';
import { ThreadList } from '@/components/dashboard/thread-list';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  LogOut,
  PlusCircle,
  Settings,
  User,
  MessageSquare,
  Loader2,
  Plug,
  BrainCircuit,
  MoreHorizontal,
  Edit,
  Trash2,
  Bot,
  Sparkles,
  Activity,
  Book,
  Share2,
  Building,
  Shield,
  Bell,
} from 'lucide-react';
import { PandoraBoxIcon } from '@/components/icons';
import { useSystemStatus } from '@/hooks/use-system-status';
import { ThemeToggle } from '@/components/theme-toggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createThread, renameThread, deleteThread, getRecentThreads } from '@/app/actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SystemStatus } from '@/components/system-status';
import { ArtifactPanel } from '@/components/chat/artifact-panel';
import { useArtifactStore } from '@/store/artifacts';
import { CommandMenu } from '@/components/command-menu';
import { useChatStore } from '@/store/chat';

function SidebarContentInternal({ threadId }: { threadId?: string }) {
  const { user } = useUser();
  const { logout } = useAuthActions();
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [agent, setAgent] = useState<'builder' | 'universe'>('builder');
  const [threads, setThreads] = useState<Thread[]>([]);
  const { inferenceStatus, memoryStatus } = useSystemStatus();

  const getStatusColor = (status: 'online' | 'offline' | 'checking') => {
    switch (status) {
      case 'online': return 'bg-primary/60';
      case 'offline': return 'bg-red-400/40';
      case 'checking': return 'bg-foreground/10 animate-pulse';
      default: return 'bg-muted';
    }
  };

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('activeWorkspaceId');
    setWorkspaceId(stored);

    const fetchWorkspaces = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/workspaces', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.warn(`[AppLayout] Workspaces fetch failed: ${response.status}`);
          return;
        }

        const data = await response.json();
        if (data.workspaces) setWorkspaces(data.workspaces);
      } catch (e) {
        console.error('Fetch Workspaces Error:', e);
      }
    };
    fetchWorkspaces();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoadingThreads(false);
      setThreads([]);
      return;
    };

    const fetchThreads = async () => {
      setLoadingThreads(true);
      try {
        const fetchedThreads = await getRecentThreads(user.uid, agent, workspaceId || undefined);
        setThreads(fetchedThreads);
      } catch (error) {
        console.error('Error fetching threads:', error);
      } finally {
        setLoadingThreads(false);
      }
    };

    fetchThreads();
  }, [user, agent, workspaceId]);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleCreateThread = async () => {
    if (user) {
      try {
        const result = await createThread(agent, user.uid, workspaceId || undefined);
        if (result?.id) {
          handleNavClick();
          router.push(`/chat/${result.id}`);
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to create thread'
        });
      }
    }
  };

  return (
    <>
      <SidebarHeader className="border-none pt-8 pb-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <PandoraBoxIcon className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/20">
              Sovereign
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none hover:bg-foreground/[0.03]"
            onClick={handleCreateThread}
          >
            <PlusCircle className="h-4 w-4 text-foreground/40 stroke-[1]" />
          </Button>
        </div>

        <div className="px-4 mt-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-8 px-2 hover:bg-foreground/[0.03] text-foreground/60 rounded-none">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Building className="h-3 w-3 stroke-[1]" />
                  <span className="truncate text-[11px] font-bold uppercase tracking-[0.4em]">
                    {workspaceId ? workspaces.find(w => w.id === workspaceId)?.name || '...' : 'Personal'}
                  </span>
                </div>
                <MoreHorizontal className="h-3 w-3 opacity-20" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              {/* ... existing content ... */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 gap-4">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/memory" className="w-full" onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname.startsWith('/memory')} className="w-full justify-start text-muted-foreground hover:text-foreground data-[active=true]:text-primary transition-colors">
                  <BrainCircuit className="h-4 w-4 stroke-[1]" />
                  <span>Memory</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/connectors" className="w-full" onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname.startsWith('/connectors')} className="w-full justify-start text-muted-foreground hover:text-foreground data-[active=true]:text-primary transition-colors">
                  <Plug className="h-4 w-4 stroke-[1]" />
                  <span>Data Connectors</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/agents" className="w-full" onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname.startsWith('/agents')} className="w-full justify-start text-muted-foreground hover:text-foreground data-[active=true]:text-primary transition-colors">
                  <Bot className="h-4 w-4 stroke-[1]" />
                  <span>Agents</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <div className="px-4 py-2">
          <Tabs value={agent} onValueChange={(value) => setAgent(value as 'builder' | 'universe')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-foreground/[0.03] p-1 rounded-none h-10">
              <TabsTrigger
                value="builder"
                className="text-[10px] uppercase tracking-[0.4em] font-bold py-1 data-[state=active]:bg-background data-[state=active]:shadow-none text-foreground/30"
              >
                Core
              </TabsTrigger>
              <TabsTrigger
                value="universe"
                className="text-[10px] uppercase tracking-[0.4em] font-bold py-1 data-[state=active]:bg-background data-[state=active]:shadow-none text-foreground/30"
              >
                Synth
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>




        <SidebarGroup className="mt-4 p-0">
          {loadingThreads ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <ThreadList
              threads={threads}
              activeThreadId={threadId}
              onNavigate={handleNavClick}
              onThreadsChanged={async () => {
                if (user) {
                  const t = await getRecentThreads(user.uid, agent, workspaceId || undefined);
                  setThreads(t);
                }
              }}
            />
          )}
        </SidebarGroup>
      </SidebarContent >

      <SidebarFooter>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 p-2 h-auto hover:bg-foreground/[0.03] group rounded-none">
              <Avatar className="h-8 w-8 rounded-none bg-foreground/[0.03] border border-foreground/5">
                {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || user.email || 'User'} />}
                <AvatarFallback>
                  <User className="h-4 w-4 text-foreground/20 stroke-[1]" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[13px] font-bold text-foreground/80 truncate max-w-[140px] group-hover:text-foreground">
                  {user?.displayName || user?.email || 'User'}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn("w-2 h-2 rounded-none transition-colors duration-300", getStatusColor(inferenceStatus))}></span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[9px] bg-black border-white/10 uppercase tracking-[0.2em] font-bold">Inference (Brain): {inferenceStatus}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn("w-2 h-2 rounded-none transition-colors duration-300", getStatusColor(memoryStatus))}></span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[9px] bg-black border-white/10 uppercase tracking-[0.2em] font-bold">Memory (Qdrant): {memoryStatus}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <span className="text-[9px] font-bold text-foreground/10 tracking-[0.4em] uppercase">System substrate</span>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => { handleNavClick(); router.push('/settings'); }}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <div className="flex items-center justify-between px-2 py-1.5">
              <Label>Theme</Label>
              <ThemeToggle />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </>
  );
}

export function AppLayout({ children, threadId }: { children: React.ReactNode; threadId?: string }) {
  const { isOpen } = useArtifactStore();
  const { isStreaming } = useChatStore();
  const router = useRouter();
  // ... (existing logic)

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden selection:bg-primary/20 selection:text-primary">
        <CommandMenu />

        {/* Top Progress Line for Inference */}
        {isStreaming && (
          <div className="inference-progress">
            <div className="inference-progress-bar" />
          </div>
        )}

        {/* Left Sidebar */}
        <div className="h-full bg-secondary/30 dark:bg-secondary/10">
          <Sidebar className="border-r border-border/40" collapsible="icon">
            <SidebarContentInternal threadId={threadId} />
          </Sidebar>
        </div>

        <SidebarInset className="flex flex-col flex-1 overflow-hidden p-0 bg-background pt-safe">
          {/* Mobile Header with Sidebar Trigger */}
          <div className="md:hidden flex items-center h-14 px-4 border-b border-border/10">
            <SidebarTrigger className="-ml-1" />
            <span className="ml-4 text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/40">Sovereign</span>
          </div>

          <div className={cn(
            "flex flex-col flex-1 min-w-0 h-full overflow-y-auto pb-safe",
            isOpen ? "hidden md:flex" : "flex"
          )}>
            {children}
          </div>

          {/* Floating Action Button (FAB) for Mobile - Replaces Bottom Dock */}
          <div className="md:hidden fixed bottom-6 right-6 z-50 pb-safe">
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-primary/90 hover:bg-primary shadow-xl backdrop-blur-sm border border-white/10 transition-all hover:scale-105 active:scale-95"
              onClick={() => router.push('/chat')}
            >
              <PlusCircle className="h-5 w-5 text-white stroke-[1]" />
            </Button>
          </div>

          {isOpen && (
            <div className="hidden md:block w-full md:w-auto h-full border-l border-border bg-background z-20">
              <ArtifactPanel />
            </div>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
