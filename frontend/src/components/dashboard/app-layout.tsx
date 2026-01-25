
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
} from 'lucide-react';
import Image from 'next/image';
import { PandoraBoxIcon } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createThread, renameThread, deleteThread, getRecentThreads } from '@/app/actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export function AppLayout({ children, threadId }: { children: React.ReactNode; threadId?: string }) {
  const { user } = useUser();
  const { logout } = useAuthActions();
  const pathname = usePathname();
  const router = useRouter();
  const [agent, setAgent] = useState<'builder' | 'universe'>('builder');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [newThreadName, setNewThreadName] = useState('');

  const handleRenameSubmit = async () => {
    if (currentThread && user && newThreadName.trim()) {
      await renameThread(currentThread.id, newThreadName.trim(), user.uid);
      toast({ title: "Thread renamed" });
      setRenameDialogOpen(false);
      // Refresh threads
      const fetchedThreads = await getRecentThreads(user.uid, agent);
      setThreads(fetchedThreads);
    }
  };


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setThreads([]);
      return;
    };
    
    const fetchThreads = async () => {
        setIsLoading(true);
        try {
            const fetchedThreads = await getRecentThreads(user.uid, agent);
            setThreads(fetchedThreads);
        } catch (error) {
            console.error('Error fetching threads:', error);
            toast({
                variant: 'destructive',
                title: 'Error fetching threads',
                description: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        } finally {
            setIsLoading(false);
        }
    };

    fetchThreads();
  }, [user, agent]);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <PandoraBoxIcon className="h-8 w-8 text-primary" />
            <span className="text-lg font-headline font-semibold text-foreground">
              Pandora's Box
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/memory" className="w-full">
                <SidebarMenuButton isActive={pathname.startsWith('/memory')} className="w-full justify-start">
                  <BrainCircuit />
                  <span>Memory</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/connectors" className="w-full">
                <SidebarMenuButton isActive={pathname.startsWith('/connectors')} className="w-full justify-start">
                  <Plug />
                  <span>Data Connectors</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/agents" className="w-full">
                <SidebarMenuButton isActive={pathname.startsWith('/agents')} className="w-full justify-start">
                  <Bot />
                  <span>Agents</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarSeparator className="my-2" />

          <Tabs value={agent} onValueChange={(value) => setAgent(value as 'builder' | 'universe')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="builder">Builder</TabsTrigger>
              <TabsTrigger value="universe">Universe</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button 
            variant="outline" 
            className="mt-4 w-full" 
            onClick={async () => {
              if (user) {
                try {
                  await createThread(agent, user.uid);
                } catch (error: any) {
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error.message || 'Failed to create thread'
                  });
                }
              }
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> New Thread
          </Button>

          <SidebarGroup className="mt-4 p-0">
            {isLoading ? (
               <div className="flex justify-center p-4">
                 <Loader2 className="h-5 w-5 animate-spin" />
               </div>
            ) : (
            <SidebarMenu>
              {threads.map((thread) => (
                <SidebarMenuItem key={thread.id}>
                  <Link href={`/chat/${thread.id}`} className="w-full">
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
                                                  // Refresh threads
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
              <DropdownMenuItem onSelect={() => router.push('/settings')}>
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
      </Sidebar>

      <SidebarInset>
        <div className="md:hidden p-2 border-b flex items-center">
            <SidebarTrigger />
            <span className="font-semibold mx-auto">Pandora's Box</span>
        </div>
        {children}
      </SidebarInset>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Thread</DialogTitle>
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
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
 
