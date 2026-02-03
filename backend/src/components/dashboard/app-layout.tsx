
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useAuthActions } from '@/firebase';
import type { Thread } from '@/lib/types';
import MobileHeader from '@/components/mobile-header';
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
  Home,
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
import { createThread, renameThread, deleteThread, getRecentThreads, getThread } from '@/app/actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SystemStatus } from '@/components/system-status';
import { ArtifactPanel } from '@/components/chat/artifact-panel';
import { useArtifactStore } from '@/store/artifacts';
import { CommandMenu } from '@/components/command-menu';

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
      case 'online': return 'bg-emerald-500 shadow-emerald-500/50';
      case 'offline': return 'bg-red-500 shadow-red-500/50';
      case 'checking': return 'bg-yellow-500 animate-pulse';
      default: return 'bg-zinc-600';
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

  // Sync agent tab with current thread
  useEffect(() => {
    if (threadId && user) {
      getThread(threadId, user.uid).then((t: Thread | null) => {
        if (t?.agent && (t.agent === 'builder' || t.agent === 'universe')) {
          setAgent(t.agent);
        }
      });
    }
  }, [threadId, user]);

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
      <SidebarHeader className="h-14 flex items-center px-4 border-b border-sidebar-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto p-0 hover:bg-transparent text-sidebar-foreground hover:text-sidebar-primary font-semibold text-sm flex items-center gap-2">
              <span>{workspaceId ? workspaces.find(w => w.id === workspaceId)?.name : 'Pandora'}</span>
              <MoreHorizontal className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Workspace</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { setWorkspaceId(null); localStorage.removeItem('activeWorkspaceId'); }}>
              Personal Vault
            </DropdownMenuItem>
            {workspaces?.map(ws => (
              <DropdownMenuItem key={ws.id} onClick={() => { setWorkspaceId(ws.id); localStorage.setItem('activeWorkspaceId', ws.id); }}>
                {ws.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/workspaces')}>
              <PlusCircle className="mr-2 h-3 w-3" /> Manage Workspaces
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-2 pt-2">
        {/* Main Actions */}
        <div className="flex gap-2 mb-4 px-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-background border-border/50 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shadow-none"
            onClick={handleCreateThread}
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Chat</span>
          </Button>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === '/'}
              onClick={() => router.push('/')}
              className="text-sidebar-foreground/80 hover:text-sidebar-foreground"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith('/memory')}
              onClick={() => router.push('/memory')}
              className="text-sidebar-foreground/80 hover:text-sidebar-foreground"
            >
              <BrainCircuit className="h-4 w-4" />
              <span>Memory</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith('/artifacts')}
              onClick={() => router.push('/artifacts')}
              className="text-sidebar-foreground/80 hover:text-sidebar-foreground"
            >
              <Book className="h-4 w-4" />
              <span>Artifacts</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator className="my-2 opacity-50" />

        <div className="px-4 py-2">
          <span className="text-xs font-medium text-sidebar-foreground/50">Recent</span>
        </div>

        <SidebarGroup className="p-0">
          {loadingThreads ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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

      <SidebarFooter className="p-2 border-t border-sidebar-border/50">
        <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={() => router.push('/settings')}>
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={logout}>
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </Button>
      </SidebarFooter>
    </>
  );
}

export function AppLayout({ children, threadId }: { children: React.ReactNode; threadId?: string }) {
  const { isOpen } = useArtifactStore();
  // ... (existing logic)

  return (
    <SidebarProvider>
      <div className="flex min-h-[100dvh] w-full bg-background overflow-hidden">
        <CommandMenu />
        <MobileHeader />

        <div className="h-full">
          <Sidebar className="border-r border-sidebar-border bg-sidebar" collapsible="icon">
            <SidebarContentInternal threadId={threadId} />
          </Sidebar>
        </div>

        <SidebarInset className="flex flex-col flex-1 overflow-hidden bg-background">
          <div className={cn(
            "flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out h-full overflow-y-auto",
            isOpen ? "hidden md:flex" : "flex"
          )}>
            {children}
          </div>

          {isOpen && (
            <div className="hidden md:block w-full md:w-auto h-full border-l border-border bg-background z-20 shadow-xl">
              <ArtifactPanel />
            </div>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
