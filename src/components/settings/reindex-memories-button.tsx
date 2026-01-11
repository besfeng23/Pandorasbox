'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { reindexMemories } from '@/app/actions';
import { Loader2, RefreshCw } from 'lucide-react';
import { useUser } from '@/firebase';
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

interface ReindexMemoriesButtonProps {
  userId: string;
}

export function ReindexMemoriesButton({ userId }: ReindexMemoriesButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();

  const handleReindex = () => {
    startTransition(async () => {
      if (!user) return;
      const token = await user.getIdToken();
      const result = await reindexMemories(token);
      setIsOpen(false);
      
      if (result.success) {
        toast({
          title: 'Memories re-indexed successfully',
          description: result.message || `Processed ${result.processed || 0} memories.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Re-indexing failed',
          description: result.message || 'Failed to re-index memories.',
        });
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card/30 p-5">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Re-index memories</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate embeddings for memories that are missing them. This is needed for vector search to work.
            Memories that already have embeddings will be skipped.
          </p>
        </div>
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              disabled={isPending}
              className="ml-4"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Re-indexing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-index Memories
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Re-index memories</AlertDialogTitle>
              <AlertDialogDescription>
                This will generate embeddings for all memories that are missing them. This process may take a few minutes
                depending on how many memories need to be re-indexed. Memories that already have embeddings will be skipped.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReindex}
                disabled={isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Re-indexing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

