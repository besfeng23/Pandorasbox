
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { AppLayout } from '@/components/dashboard/app-layout';
import { useUser, useFirestore } from '@/firebase';
import {
  Loader2,
  BrainCircuit,
  Clock,
  FileText,
  Filter,
  Lightbulb,
  Heart,
  CheckCircle,
  User as UserIcon,
  MapPin,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Memory } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteMemoryAction } from '@/app/actions';

const memoryTypes: Memory['type'][] = ['fact', 'preference', 'commitment', 'person', 'place'];

const getMemoryIcon = (type: Memory['type']) => {
  const iconProps = { className: 'h-5 w-5 text-primary' };
  switch (type) {
    case 'fact':
      return <Lightbulb {...iconProps} />;
    case 'preference':
      return <Heart {...iconProps} />;
    case 'commitment':
      return <CheckCircle {...iconProps} />;
    case 'person':
      return <UserIcon {...iconProps} />;
    case 'place':
      return <MapPin {...iconProps} />;
    default:
      return <BrainCircuit {...iconProps} />;
  }
};

export default function MemoryPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const db = useFirestore();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<Memory['type'] | 'all'>('all');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/login');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (!user || !db) return;

    setLoading(true);
    const q = query(collection(db, 'users', user.uid, 'memories'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedMemories: Memory[] = [];
        snapshot.forEach((doc) => {
          fetchedMemories.push({ id: doc.id, ...doc.data() } as Memory);
        });
        setMemories(fetchedMemories);
        setLoading(false);
      },
      (error) => {
        const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}/memories`,
            operation: 'list'
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, db]);

  const filteredMemories = useMemo(() => {
    if (activeFilter === 'all') {
      return memories;
    }
    return memories.filter((memory) => memory.type === activeFilter);
  }, [memories, activeFilter]);

  const formatTimestamp = (timestamp: Timestamp | Date) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const openDeleteDialog = (memory: Memory) => {
    setSelectedMemory(memory);
    setDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedMemory || !user) return;
    setIsSubmitting(true);
    try {
      await deleteMemoryAction(selectedMemory.id, user.uid);
      toast({ title: 'Memory Deleted' });
      setDeleteAlertOpen(false);
      setSelectedMemory(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Memory',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading || loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <AppLayout>
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
              <BrainCircuit className="h-8 w-8" />
              Memory Inspector
            </h1>
            <p className="text-muted-foreground">
              Review, filter, and manage the memories your agent has learned.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-4 border-b">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter by type:
          </span>
          <Button
            variant={activeFilter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('all')}
          >
            All
          </Button>
          {memoryTypes.map((type) => (
            <Button
              key={type}
              variant={activeFilter === type ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter(type)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>

        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-24 text-center">
            <h3 className="text-xl font-semibold tracking-tight">No memories yet</h3>
            <p className="mt-2 text-muted-foreground">
              Start a conversation with an agent, and memories will appear here.
            </p>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-24 text-center">
            <h3 className="text-xl font-semibold tracking-tight">No memories match your filter</h3>
            <p className="mt-2 text-muted-foreground">
              Try selecting a different memory type or clearing the filter.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMemories.map((memory) => (
              <Card
                key={memory.id}
                className={cn(
                  'flex flex-col transform-gpu transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-2xl',
                  'dark:bg-gradient-to-br dark:from-card dark:to-background',
                  'light:bg-gradient-to-br light:from-card light:to-muted/50'
                )}
              >
                <CardHeader className="flex flex-row items-start justify-between">
                    <div className="space-y-1.5">
                        <CardTitle className="flex items-center gap-3 text-lg">
                            {getMemoryIcon(memory.type)}
                            <span className="capitalize">{memory.type}</span>
                        </CardTitle>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground pl-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimestamp(memory.createdAt)}</span>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openDeleteDialog(memory)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>

                <CardContent className="flex-grow space-y-4">
                  <p className="text-foreground/90">{memory.content}</p>
                  {memory.sourceMessageId && (
                    <div className="text-xs text-muted-foreground/80 p-3 border-l-2 border-primary/50 bg-accent/50 rounded-r-md">
                      <p className="font-medium flex items-center gap-2 text-foreground/80">
                        <FileText className="h-4 w-4" />
                        Source
                      </p>
                      <p className="italic mt-1">"{memory.sourceMessageId}"</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                  <div className="w-full space-y-2">
                    <div className="flex justify-between w-full items-center">
                        <span className="text-xs font-medium text-muted-foreground">Relevance</span>
                        <span className="text-xs font-bold text-foreground">{(memory.relevance * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={memory.relevance * 100} className="h-2" />
                  </div>
                  <div className="w-full space-y-2">
                    <div className="flex justify-between w-full items-center">
                        <span className="text-xs font-medium text-muted-foreground">Confidence</span>
                        <span className="text-xs font-bold text-foreground">{(memory.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={memory.confidence * 100} className="h-2" />
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

       <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the memory:
                        <span className="font-bold block mt-2 text-foreground">"{selectedMemory?.content}"</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedMemory(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDelete} 
                        disabled={isSubmitting}
                        className={buttonVariants({ variant: "destructive" })}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Memory
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </AppLayout>
  );
}
