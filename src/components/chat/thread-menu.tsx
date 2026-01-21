'use client';

import React, { useState, useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, Pin, PinOff, Archive, ArchiveRestore, Edit, Trash2, FileText } from 'lucide-react';
import { updateThread, deleteThread } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ThreadMenuProps {
  threadId: string;
  userId: string;
  agentId: string; // New agentId prop
  threadTitle?: string;
  pinned?: boolean;
  archived?: boolean;
  onRename?: () => void;
  onViewDetails?: () => void;
  onDeleted?: () => void;
}

export function ThreadMenu({ threadId, userId, agentId, threadTitle = '', pinned, archived, onRename, onViewDetails, onDeleted }: ThreadMenuProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const { toast } = useToast();

  const handlePin = () => {
    startTransition(async () => {
      const result = await updateThread(threadId, userId, agentId, { pinned: !pinned });
      if (result.success) {
        toast({ title: pinned ? 'Thread unpinned' : 'Thread pinned' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      const result = await updateThread(threadId, userId, agentId, { archived: !archived });
      if (result.success) {
        toast({ title: archived ? 'Thread unarchived' : 'Thread archived' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteThread(threadId, userId, agentId);
      if (result.success) {
        toast({ title: 'Thread deleted' });
        setDeleteDialogOpen(false);
        onDeleted?.();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const handleRename = () => {
    if (!newTitle.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Title cannot be empty.' });
      return;
    }
    
    startTransition(async () => {
      const result = await updateThread(threadId, userId, agentId, { title: newTitle.trim() });
      if (result.success) {
        toast({ title: 'Thread renamed' });
        setRenameDialogOpen(false);
        setNewTitle('');
        onRename?.();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const openRenameDialog = () => {
    setNewTitle(threadTitle);
    setRenameDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-panel-strong border border-cyan-400/20">
          {onViewDetails && (
            <>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
                <FileText className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openRenameDialog(); }}>
            <Edit className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePin(); }} disabled={isPending}>
            {pinned ? (
              <>
                <PinOff className="mr-2 h-4 w-4" />
                Unpin
              </>
            ) : (
              <>
                <Pin className="mr-2 h-4 w-4" />
                Pin
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(); }} disabled={isPending}>
            {archived ? (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }}
            className="text-red-400 focus:text-red-300"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-panel-strong border border-red-400/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Thread</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this thread? This action cannot be undone and will delete all messages in this thread.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="glass-panel-strong border border-cyan-400/20">
          <DialogHeader>
            <DialogTitle>Rename Thread</DialogTitle>
            <DialogDescription>
              Enter a new name for this thread.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Thread title"
              className="bg-black/40 border-white/10 text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleRename();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setRenameDialogOpen(false);
                setNewTitle('');
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={isPending || !newTitle.trim()}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

