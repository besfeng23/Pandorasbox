'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/dashboard/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Bot, BrainCircuit, History, ArrowRight } from 'lucide-react';
import { createThread, getRecentThreads } from '@/app/actions';
import { Timestamp } from 'firebase/firestore';
import { WelcomeScreen } from '@/components/chat/welcome-screen';
import type { Thread } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ErrorBoundary } from '@/components/error-boundary';
import { PageHeader, PageShell } from '@/components/ui/page-shell';

export default function DashboardPage() {
  const { user, loading: userLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [recentThreads, setRecentThreads] = useState<Thread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoadingThreads(false);
      return;
    }

    const fetchThreads = async () => {
      setIsLoadingThreads(true);
      try {
        const threads = await getRecentThreads(user.uid);
        setRecentThreads(threads);
      } catch (error) {
        console.error('Error fetching threads:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch recent threads.' });
      } finally {
        setIsLoadingThreads(false);
      }
    };

    fetchThreads();
  }, [user, toast]);

  const handleCreateThread = async (agent: 'builder' | 'universe') => {
    if (!user) return;
    const result = await createThread(agent, user.uid);
    if (result?.id) router.push(`/chat/${result.id}`);
  };

  const formatTimestamp = (timestamp: Timestamp | Date | string | number | null | undefined) => {
    if (!timestamp) return 'N/A';
    if (timestamp instanceof Timestamp) return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
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
        <PageShell>
          {isLoadingThreads ? (
            <div className="space-y-6">
              <Skeleton className="h-12 w-2/3" />
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="mt-2 h-5 w-64" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : recentThreads.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <WelcomeScreen />
            </div>
          ) : (
            <div className="space-y-6">
              <PageHeader
                title={`Welcome back${user.displayName ? `, ${user.displayName}` : ''}`}
                description="Continue a chat or start fresh."
                actions={
                  <>
                    <Button onClick={() => handleCreateThread('universe')}>
                      <BrainCircuit className="mr-2 h-4 w-4" /> Ask
                    </Button>
                    <Button variant="secondary" onClick={() => handleCreateThread('builder')}>
                      <Bot className="mr-2 h-4 w-4" /> Build
                    </Button>
                  </>
                }
              />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <History className="h-5 w-5" /> Recent threads
                  </CardTitle>
                  <CardDescription>Pick up where you left off.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {recentThreads.map((thread) => (
                      <li key={thread.id}>
                        <Link href={`/chat/${thread.id}`} className="block rounded-lg border border-border/80 px-4 py-3 transition-colors hover:bg-accent/40">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              {thread.agent === 'builder' ? (
                                <Bot className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="truncate text-sm font-medium">{thread.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="hidden text-xs text-muted-foreground sm:inline">{formatTimestamp(thread.updatedAt)}</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </PageShell>
      </ErrorBoundary>
    </AppLayout>
  );
}
