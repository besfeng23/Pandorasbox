
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useAuthActions } from '@/firebase';
import type { Thread } from '@/lib/types';
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

function SidebarContentInternal({ threadId }: { threadId?: string }) {
  const { user } = useUser();
  const { logout } = useAuthActions();
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [agent, setAgent] = useState<'builder' | 'universe'>('builder');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const { toast } = useToast();

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [newThreadName, setNewThreadName] = useState('');

  const handleRenameSubmit = async () => {
    if (currentThread && user && newThreadName.trim()) {
      await renameThread(currentThread.id, newThreadName.trim(), user.uid);
      toast({ title: "Thread renamed" });
      setRenameDialogOpen(false);
      const fetchedThreads = await getRecentThreads(user.uid, agent, workspaceId || undefined);
      setThreads(fetchedThreads);
    }
  };

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
      <SidebarHeader className="border-b border-white/5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-center gap-2" onClick={handleNavClick}>
            <PandoraBoxIcon className="h-8 w-8 text-primary" />
            <span className="text-lg font-headline font-semibold text-foreground">
              Pandora
            </span>
          </Link>
          <ThemeToggle />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 group transition-all">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center shrink-0">
                  <Building className="h-3 w-3 text-primary" />
                </div>
                <span className="truncate text-xs font-medium">
                  {workspaceId ? workspaces.find(w => w.id === workspaceId)?.name || 'Loading...' : 'Personal Vault'}
                </span>
              </div>
              <MoreHorizontal className="h-3 w-3 opacity-50 group-hover:opacity-100" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">Switch Workspace</DropdownMenuLabel>
            <DropdownMenuItem
              className={cn("text-xs", !workspaceId && "bg-primary/10")}
              onClick={() => {
                setWorkspaceId(null);
                localStorage.removeItem('activeWorkspaceId');
              }}
            >
              Personal Vault
            </DropdownMenuItem>
            {workspaces.map(ws => (
              <DropdownMenuItem
                key={ws.id}
                className={cn("text-xs", workspaceId === ws.id && "bg-primary/10")}
                onClick={() => {
                  setWorkspaceId(ws.id);
                  localStorage.setItem('activeWorkspaceId', ws.id);
                }}
              >
                {ws.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs" onClick={() => router.push('/workspaces')}>
              <PlusCircle className="mr-2 h-3 w-3" />
              Manage Workspaces
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="p-2 gap-4">
        <SidebarGroup>
          <div className="px-4 py-2 mb-1">
            <h4 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">Conversations</h4>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/" className="w-full" onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname === '/'} className="w-full justify-start">
                  <Bot />
                  <span>Chat Assistant</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Button
                variant="default"
                className="w-full justify-start shadow-md hover:shadow-lg transition-all group bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleCreateThread}
              >
                <PlusCircle className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Start New Chat</span>
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <div className="px-4 py-2 mb-1 mt-4 border-t border-white/5 pt-4">
            <h4 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">Knowledge</h4>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/memory" className="w-full" onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname.startsWith('/memory')} className="w-full justify-start">
                  <BrainCircuit />
                  <span>Memory Vault</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/knowledge" className="w-full" onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname.startsWith('/knowledge')} className="w-full justify-start">
                  <Book />
                  <span>Knowledge Library</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/graph" className="w-full" onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname.startsWith('/graph')} className="w-full justify-start">
                  <Share2 />
                  <span>Knowledge Graph</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <div className="px-4 py-2 mb-1 mt-4 border-t border-white/5 pt-4">
            <h4 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">Assets</h4>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/artifacts" className="w-full" onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname.startsWith('/artifacts')} className="w-full justify-start">
                  <Sparkles />
                  <span>Assets</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <div className="px-4 py-2 mb-1 mt-4 border-t border-white/5 pt-4">
            <h4 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">System</h4>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/connectors" className="w-full" onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname.startsWith('/connectors')} className="w-full justify-start">
                  <Plug />
                  <span>Connectors</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/agents" className="w-full" onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname.startsWith('/agents')} className="w-full justify-start">
                  <User />
                  <span>Agent Fleet</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/health" className="w-full" onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname.startsWith('/health')} className="w-full justify-start">
                  <Activity />
                  <span>Health Stats</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/admin" className="w-full" onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname.startsWith('/admin')} className="w-full justify-start">
                  <Shield />
                  <span>Admin Panel</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-2" />

        <div className="px-4 py-2">
          <Tabs value={agent} onValueChange={(value) => setAgent(value as 'builder' | 'universe')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50 rounded-lg">
              <TabsTrigger value="builder" className="text-[10px] py-1">Builder</TabsTrigger>
              <TabsTrigger value="universe" className="text-[10px] py-1">Universe</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <SidebarGroup className="mt-4 p-0">
          {loadingThreads ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <SidebarMenu>
              {threads.map((thread) => (
                <SidebarMenuItem key={thread.id}>
                  <Link href={`/chat/${thread.id}`} className="w-full" onClick={handleNavClick}>
                    <SidebarMenuButton isActive={threadId === thread.id} className="w-full justify-start">
                      <MessageSquare />
                      <span>{thread.name}</span>
                    </SidebarMenuButton>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover>
                        <MoreHorizontal />
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem onSelect={() => {
                        setCurrentThread(thread);
                        setNewThreadName(thread.name);
                        setRenameDialogOpen(true);
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Rename</span>
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the thread "{thread.name}" and all its messages. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className={buttonVariants({ variant: 'destructive' })}
                              onClick={async () => {
                                if (user) {
                                  await deleteThread(thread.id, user.uid);
                                  toast({ title: `Thread "${thread.name}" deleted.` });
                                  const fetchedThreads = await getRecentThreads(user.uid, agent);
                                  setThreads(fetchedThreads);
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SystemStatus />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 p-2">
              <Avatar className="h-8 w-8">
                {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || user.email || 'User'} />}
                <AvatarFallback>
                  <User />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-foreground">
                  {user?.displayName || user?.email || 'User'}
                </span>
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

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Thread</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleRenameSubmit(); }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={newThreadName}
                  onChange={(e) => setNewThreadName(e.target.value)}
                  className="col-span-3"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AppLayout({ children, threadId }: { children: React.ReactNode; threadId?: string }) {
  const { isOpen } = useArtifactStore();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden selection:bg-primary/20 selection:text-primary">
        <CommandMenu />
        <Sidebar className="border-r-0 glass-surface-strong" collapsible="icon">
          <SidebarContentInternal threadId={threadId} />
        </Sidebar>

        <SidebarInset className="flex flex-row overflow-hidden p-0 bg-gradient-to-br from-background to-muted/50 dark:to-muted/10">
          <div className={cn(
            "flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out",
            isOpen ? "hidden md:flex" : "flex"
          )}>
            {/* Enhanced Mobile Header */}
            <div className="md:hidden glass-surface sticky top-0 z-30 flex items-center h-14 px-4 border-b border-white/10 safe-area-pt">
              <SidebarTrigger className="h-10 w-10 p-2 -ml-2 hover:bg-primary/10 transition-colors" />
              <div className="flex-1 text-center pr-8">
                <span className="font-headline font-semibold text-foreground tracking-tight">Pandora's Box</span>
              </div>
            </div>
            {children}
          </div>

          {isOpen && (
            <div className="w-full md:w-auto h-full border-l border-border bg-background z-20">
              <ArtifactPanel />
            </div>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
