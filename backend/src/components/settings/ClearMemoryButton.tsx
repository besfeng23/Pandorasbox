'use client';

import React, { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { clearMemory } from '@/app/actions';
import { useUser } from '@/firebase';
import { Trash2, Loader2 } from 'lucide-react';
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

interface ClearMemoryButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link';
  agentId?: string; // Add agentId prop
}

export function ClearMemoryButton({ variant = 'destructive', agentId = 'universe' }: ClearMemoryButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = React.useState(false);
  const { toast } = useToast();
  const { user } = useUser();

  const handleClearAll = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to clear data.' });
      return;
    }

    startTransition(async () => {
      // Use user.uid and agentId, not token
      const result = await clearMemory(user.uid, agentId);

      setIsOpen(false);

      if (result.success) {
        toast({
          title: 'Cleared',
          description: result.message || 'All your data has been permanently deleted.'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed',
          description: result.message || 'Failed to clear data.'
        });
      }
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          disabled={!user}
          className="shadow-sm"
          aria-label="Clear all data"
          data-testid="settings-clear-open"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear all data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass-panel-strong border border-destructive/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Clear all data?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            This will permanently delete your conversation history, memories, artifacts, workspace state, and knowledge
            base files.
          </AlertDialogDescription>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <ul className="list-disc list-inside">
              <li>All threads and messages</li>
              <li>All memories</li>
              <li>All artifacts</li>
              <li>All workspace state</li>
              <li>All knowledge base files</li>
            </ul>
            <strong className="text-destructive block mt-3">This action cannot be undone.</strong>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            aria-label="Cancel clear all data"
            data-testid="settings-clear-cancel"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearAll}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
            aria-label="Confirm clear all data"
            data-testid="settings-clear-confirm"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              'Yes, delete everything'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

