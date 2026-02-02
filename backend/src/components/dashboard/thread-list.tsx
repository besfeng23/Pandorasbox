'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Thread } from '@/lib/types';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction } from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { renameThread, deleteThread } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { motion } from 'framer-motion';

// Motion variants
const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const staggerItem = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface ThreadListProps {
    threads: Thread[] | undefined;
    activeThreadId?: string;
    onNavigate: () => void;
    onThreadsChanged: () => void;
}

export function ThreadList({ threads, activeThreadId, onNavigate, onThreadsChanged }: ThreadListProps) {
    const { user } = useUser();
    const { toast } = useToast();

    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [currentThread, setCurrentThread] = useState<Thread | null>(null);
    const [newThreadName, setNewThreadName] = useState('');

    const handleRenameSubmit = async () => {
        if (currentThread && user && newThreadName.trim()) {
            await renameThread(currentThread.id, newThreadName.trim(), user.uid);
            toast({ title: "Thread renamed" });
            setRenameDialogOpen(false);
            onThreadsChanged();
        }
    };

    const safeThreads = threads || [];

    return (
        <>
            <SidebarMenu>
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="flex flex-col gap-1"
                >
                    {safeThreads.map((thread) => (
                        <motion.div key={thread.id} variants={staggerItem}>
                            <SidebarMenuItem>
                                <Link href={`/chat/${thread.id}`} className="w-full" onClick={onNavigate}>
                                    <SidebarMenuButton isActive={activeThreadId === thread.id} className="w-full justify-start hover:bg-muted text-[13px] font-medium ios-press">
                                        <MessageSquare className="h-4 w-4 stroke-[1] text-muted-foreground/60" />
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
                                                        This will permanently delete the thread "{thread.name}". This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className={buttonVariants({ variant: 'destructive' })}
                                                        onClick={async () => {
                                                            if (user) {
                                                                await deleteThread(thread.id, user.uid);
                                                                toast({ title: "Thread deleted" });
                                                                onThreadsChanged();
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
                        </motion.div>
                    ))}
                </motion.div>
            </SidebarMenu>

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
