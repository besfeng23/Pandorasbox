'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/dashboard/app-layout';
import { useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, PlusCircle, Bot, BrainCircuit, History, ArrowRight } from 'lucide-react';
import { createThread, getRecentThreads } from '@/app/actions';
import { Timestamp } from 'firebase/firestore';
import type { Thread } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { ErrorBoundary } from '@/components/error-boundary';

function WelcomeScreen() {
    const { user } = useUser();
    const handleCreateThread = async (agent: 'builder' | 'universe') => {
        if (user) {
            await createThread(agent, user.uid);
        }
    };

    return (
        <div className="text-center">
            <h1 className="font-headline text-4xl font-bold tracking-tight">Welcome to Pandora's Box</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Your personal AI companion for building and exploring. Let's get you started.
            </p>
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                        <PlusCircle className="h-6 w-6" />
                        Create your first thread
                    </CardTitle>
                    <CardDescription>
                        Choose an agent to start a new conversation. Each agent has a unique purpose.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                    <div className="flex flex-col space-y-3 rounded-lg border p-6">
                        <h3 className="font-semibold">Builder Agent</h3>
                        <p className="flex-grow text-sm text-muted-foreground">
                            The Builder agent helps you create and refine ideas. It's your collaborative partner for brainstorming, writing, and problem-solving.
                        </p>
                        <Button onClick={() => handleCreateThread('builder')} className="mt-auto">
                            <Bot className="mr-2 h-4 w-4" /> Start with Builder
                        </Button>
                    </div>
                    <div className="flex flex-col space-y-3 rounded-lg border p-6">
                        <h3 className="font-semibold">Universe Agent</h3>
                        <p className="flex-grow text-sm text-muted-foreground">
                            The Universe agent has access to a broad range of knowledge. Use it to learn new things, explore topics, and get answers to your questions.
                        </p>
                        <Button onClick={() => handleCreateThread('universe')} className="mt-auto">
                            <BrainCircuit className="mr-2 h-4 w-4" /> Start with Universe
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();

  const [recentThreads, setRecentThreads] = useState<Thread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/login');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (!user) {
        setIsLoadingThreads(false);
        return;
    };

    const fetchThreads = async () => {
        setIsLoadingThreads(true);
        try {
            const threads = await getRecentThreads(user.uid);
            setRecentThreads(threads);
        } catch (error) {
            console.error('Error fetching threads:', error);
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not fetch recent threads.'
            });
        } finally {
            setIsLoadingThreads(false);
        }
    };

    fetchThreads();
  }, [user, toast]);

  const handleCreateThread = async (agent: 'builder' | 'universe') => {
    if (user) {
      await createThread(agent, user.uid);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    // Handle Firestore Timestamp
    if (timestamp instanceof Timestamp) {
        return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    }
    // Handle Date object or ISO string
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'N/A';
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  if (userLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <ErrorBoundary>
        <div className="flex-1 space-y-8 p-4 md:p-8">
          {isLoadingThreads ? (
              <div className="w-full max-w-4xl mx-auto space-y-8">
                  <Skeleton className="h-12 w-2/3" />
                  <Skeleton className="h-8 w-1/2" />
                  <Card>
                      <CardHeader>
                          <Skeleton className="h-8 w-48" />
                          <Skeleton className="h-5 w-64 mt-2" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <div className="flex items-center gap-4 p-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-6 flex-1" /></div>
                          <div className="flex items-center gap-4 p-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-6 flex-1" /></div>
                          <div className="flex items-center gap-4 p-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-6 flex-1" /></div>
                      </CardContent>
                  </Card>
              </div>
          ) : recentThreads.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                   <WelcomeScreen />
              </div>
          ) : (
              <div className="w-full max-w-4xl mx-auto space-y-8">
                  <div className="space-y-2">
                      <h1 className="font-headline text-4xl font-bold tracking-tight">Welcome back, {user.displayName || 'Explorer'}!</h1>
                      <p className="text-lg text-muted-foreground">
                          Here's what you've been working on.
                      </p>
                  </div>
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                              <History className="h-6 w-6" />
                              Recent Threads
                          </CardTitle>
                          <CardDescription>
                              Jump back into one of your recent conversations.
                          </CardDescription>
                      </CardHeader>
                      <CardContent>
                         <ul className="space-y-2">
                              {recentThreads.map(thread => (
                                  <li key={thread.id}>
                                      <Link href={`/chat/${thread.id}`} className="block rounded-lg border p-4 transition-colors hover:bg-accent">
                                          <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                  {thread.agent === 'builder' ? <Bot className="h-5 w-5 text-muted-foreground" /> : <BrainCircuit className="h-5 w-5 text-muted-foreground" />}
                                                  <span className="font-medium">{thread.name}</span>
                                              </div>
                                              <div className="flex items-center gap-4">
                                                  <span className="text-sm text-muted-foreground">{formatTimestamp(thread.updatedAt)}</span>
                                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                              </div>
                                          </div>
                                      </Link>
                                  </li>
                              ))}
                         </ul>
                      </CardContent>
                  </Card>
                   <div className="flex items-center gap-4">
                      <Button onClick={() => handleCreateThread('builder')}>
                          <Bot className="mr-2 h-4 w-4" /> New Builder Thread
                      </Button>
                      <Button variant="secondary" onClick={() => handleCreateThread('universe')}>
                          <BrainCircuit className="mr-2 h-4 w-4" /> New Universe Thread
                      </Button>
                  </div>
              </div>
          )}
        </div>
      </ErrorBoundary>
    </AppLayout>
  );
}
 