'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useAuthActions } from '@/firebase';
import type { Thread } from '@/lib/types';
import {
  Sidebar,
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
  Home,
  MoreHorizontal,
  Edit,
  Trash2,
  Bot,
} from 'lucide-react';
import { PandoraBoxIcon } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import { createThread, renameThread, deleteThread, getRecentThreads } from '@/app/actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SystemStatus } from '@/components/system-status';
import { ArtifactPanel } from '@/components/chat/artifact-panel';
import { useArtifactStore } from '@/store/artifacts';
import { StateBlock } from '@/components/ui/state-block';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function SidebarContentInternal({ threadId }: { threadId?: string }) {
  const { user } = useUser();
  const { logout } = useAuthActions();
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [newThreadName, setNewThreadName] = useState('');

  const handleRenameSubmit = async () => {
    if (currentThread && user && newThreadName.trim()) {
      await renameThread(currentThread.id, newThreadName.trim(), user.uid);
      toast({ title: 'Thread renamed' });
      setRenameDialogOpen(false);
      const fetchedThreads = await getRecentThreads(user.uid);
      setThreads(fetchedThreads);
    }
  };

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setThreads([]);
      return;
    }

    const fetchThreads = async () => {
      setIsLoading(true);
      try {
        const fetchedThreads = await getRecentThreads(user.uid);
        setThreads(fetchedThreads);
      } catch (error) {
        console.error('Error fetching threads:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreads();
  }, [user]);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleCreateThread = async () => {
    if (user) {
      try {
        const result = await createThread('universe', user.uid);
        if (result?.id) {
          handleNavClick();
          router.push(`/chat/${result.id}`);
        }
      } catch (error: unknown) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: getErrorMessage(error, 'Failed to create thread'),
        });
      }
    }
  };

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <Link href="/" className="flex items-center gap-2" onClick={handleNavClick}>
          <PandoraBoxIcon className="h-8 w-8 text-primary" />
          <div className="flex flex-col">
            <span className="text-headline font-semibold text-foreground">Pandora&apos;s Box</span>
            <span className="text-xs text-sidebar-foreground/70">Chat and memory</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-3">
        <div className="space-y-4">
          <div>
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-[0.18em] text-sidebar-foreground/45">Main</p>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/chat" className="w-full" onClick={handleNavClick}>
                  <SidebarMenuButton isActive={pathname === '/chat' || pathname.startsWith('/chat/')} className="w-full justify-start">
                    <Home />
                    <span>Chat</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/memory" className="w-full" onClick={handleNavClick}>
                  <SidebarMenuButton isActive={pathname.startsWith('/memory')} className="w-full justify-start">
                    <BrainCircuit />
                    <span>Memory</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>

          <div>
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-[0.18em] text-sidebar-foreground/45">Tools</p>
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
                    <Bot />
                    <span>Agents</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/settings" className="w-full" onClick={handleNavClick}>
                  <SidebarMenuButton isActive={pathname.startsWith('/settings')} className="w-full justify-start">
                    <Settings />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </div>

        <SidebarSeparator className="my-4" />

        <Button variant="outline" className="w-full" onClick={handleCreateThread}>
          <PlusCircle className="mr-2 h-4 w-4" /> New chat
        </Button>

        <SidebarGroup className="mt-4 min-h-0 flex-1 p-0">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-[0.18em] text-sidebar-foreground/45">Recent</p>
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <StateBlock
              className="min-h-[140px] border-0 bg-transparent px-2 py-6"
              title="No recent threads"
              description="Start a new chat and it will appear here."
            />
          ) : (
            <SidebarMenu>
              {threads.map((thread) => (
                <SidebarMenuItem key={thread.id}>
                  <Link href={`/chat/${thread.id}`} className="w-full" onClick={handleNavClick}>
                    <SidebarMenuButton isActive={threadId === thread.id} className="w-full justify-start">
                      <MessageSquare className="shrink-0" />
                      <span className="truncate">{thread.name}</span>
                    </SidebarMenuButton>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover>
                        <MoreHorizontal />
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem
                        onSelect={() => {
                          setCurrentThread(thread);
                          setNewThreadName(thread.name);
                          setRenameDialogOpen(true);
                        }}
                      >
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
                            <AlertDialogTitle>Delete thread?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete “{thread.name}” and all messages.
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
                                  const fetchedThreads = await getRecentThreads(user.uid);
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

      <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
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
              <div className="flex min-w-0 flex-col items-start">
                <span className="truncate text-sm font-medium text-foreground">{user?.displayName || user?.email || 'User'}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                handleNavClick();
                router.push('/settings');
              }}
            >
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
            <DialogTitle>Rename thread</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleRenameSubmit(); }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
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
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
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
    <div className="flex min-h-screen w-full overflow-hidden bg-background">
      <Sidebar>
        <SidebarContentInternal threadId={threadId} />
      </Sidebar>

      <SidebarInset className="flex flex-row overflow-hidden p-0">
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col transition-all duration-panel ease-standard',
            isOpen ? 'hidden md:flex' : 'flex'
          )}
        >
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-semibold">Pandora&apos;s Box</span>
          </div>
          {children}
        </div>

        {isOpen && (
          <div className="h-full w-full border-l border-border bg-background md:w-auto">
            <ArtifactPanel />
          </div>
        )}
      </SidebarInset>
    </div>
  );
}
