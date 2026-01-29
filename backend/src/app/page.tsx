'use client';

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/dashboard/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { LogoutButton } from '@/components/auth/logout-button';
import { useFirestore } from '@/firebase';
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
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PandoraBoxIcon } from '@/components/icons';

export default function DashboardPage() {
    const { user, isLoading: userLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [recentThreads, setRecentThreads] = useState<Thread[]>([]);
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
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
            const result = await createThread(agent, user.uid);
            if (result?.id) {
                router.push(`/chat/${result.id}`);
            }
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
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-6xl mx-auto p-4 md:p-12 space-y-8 md:space-y-12 animate-in-fade">
                        {/* Hero Section */}
                        <header className="text-center space-y-4 py-4 md:py-8">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                                className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-2 md:mb-4"
                            >
                                <PandoraBoxIcon className="h-10 w-10 md:h-12 md:w-12 text-primary" />
                            </motion.div>
                            <h1 className="font-headline text-3xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent px-2">
                                Welcome, {user.displayName || 'Explorer'}
                            </h1>
                            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
                                Your multi-modal intelligence hub is ready. What shall we evolve today?
                            </p>
                        </header>

                        {/* Quick Actions Grid */}
                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-2">
                            <Card className="glass-panel group hover:shadow-primary/5 transition-all duration-300 cursor-pointer overflow-hidden border-white/10" onClick={() => handleCreateThread('builder')}>
                                <CardContent className="p-6 space-y-4">
                                    <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Bot className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg">Build Something New</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2">Start a fresh Builder session for code, logic, and creation.</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="glass-panel group hover:shadow-primary/5 transition-all duration-300 cursor-pointer overflow-hidden border-white/10" onClick={() => handleCreateThread('universe')}>
                                <CardContent className="p-6 space-y-4">
                                    <div className="h-12 w-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                                        <BrainCircuit className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg">Explore the Universe</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2">Ask complex questions and dive into global knowledge.</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="glass-panel p-6 flex flex-col justify-between border-white/10 bg-muted/5">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Pulse Check</h3>
                                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Inference</span>
                                            <span className="font-medium text-green-500">Active</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Neural Memory</span>
                                            <span className="font-medium">6.2 GB</span>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="link" className="p-0 h-auto justify-start text-xs text-primary group" onClick={() => router.push('/health')}>
                                    Full Diagnostics <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Card>
                        </section>

                        {/* Recent Activity */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold tracking-tight px-1">Recent Sessions</h2>
                                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => router.push('/chat')}>View All</Button>
                            </div>

                            {isLoadingThreads ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Skeleton className="h-24 w-full rounded-2xl" />
                                    <Skeleton className="h-24 w-full rounded-2xl" />
                                </div>
                            ) : recentThreads.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-3xl border-muted/20">
                                    <p className="text-muted-foreground">No recent sessions found. Start building to see them here.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {recentThreads.slice(0, 4).map(thread => (
                                        <Link key={thread.id} href={`/chat/${thread.id}`} className="group">
                                            <Card className="bg-card hover:bg-accent/50 transition-all duration-300 border shadow-none hover:shadow-md rounded-2xl overflow-hidden">
                                                <CardContent className="p-5 flex items-center justify-between">
                                                    <div className="flex items-center gap-4 overflow-hidden">
                                                        <div className={cn(
                                                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                                            thread.agent === 'builder' ? "bg-primary/10 text-primary" : "bg-purple-500/10 text-purple-500"
                                                        )}>
                                                            {thread.agent === 'builder' ? <Bot className="h-5 w-5" /> : <BrainCircuit className="h-5 w-5" />}
                                                        </div>
                                                        <div className="space-y-0.5 truncate">
                                                            <h4 className="font-medium truncate">{thread.name}</h4>
                                                            <p className="text-xs text-muted-foreground">{formatTimestamp(thread.updatedAt)}</p>
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </ErrorBoundary>
        </AppLayout>
    );
}
