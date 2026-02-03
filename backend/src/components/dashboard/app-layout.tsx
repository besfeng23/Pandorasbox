
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
      <SidebarContent className="gap-1 px-2 pt-4">
        <div className="flex items-center justify-between px-2 mb-4">
          <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">Menu</span>
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

        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-sidebar-foreground/50">Recent</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 text-sidebar-foreground/50 hover:text-sidebar-foreground"
            onClick={handleCreateThread}
            title="New Chat"
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground p-2 h-auto">
              <Avatar className="h-6 w-6 rounded-md">
                <AvatarImage src={user?.photoURL || ''} />
                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <span className="text-xs truncate font-medium">{user?.displayName || 'User'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Workspace</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { setWorkspaceId(null); localStorage.removeItem('activeWorkspaceId'); }}>
              Personal Vault
            </DropdownMenuItem>
            {workspaces?.map(ws => (
              <DropdownMenuItem key={ws.id} onClick={() => { setWorkspaceId(ws.id); localStorage.setItem('activeWorkspaceId', ws.id); }}>
                {ws.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

        <div className="h-full flex">
          <Sidebar className="border-r border-sidebar-border bg-sidebar" collapsible="icon">
            <SidebarContentInternal threadId={threadId} />
          </Sidebar>

          <div className="hidden md:flex items-center pt-2 pl-2 absolute z-50">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          </div>
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
