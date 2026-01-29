'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Server, Database, MessageSquare, FileText, Code, Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { toast } from 'sonner';

interface AdminStats {
    stats: {
        threads: number;
        documents: number;
        artifacts: number;
        vectors: number;
    };
    services: {
        inference: 'online' | 'offline';
        memory: 'online' | 'offline';
    };
    recentActivity: Array<{
        id: string;
        name: string;
        updatedAt: string;
    }>;
    timestamp: string;
}

export default function AdminPage() {
    const { user } = useUser();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        if (!user) return;

        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }

            const data = await response.json();
            setStats(data);
        } catch (error: any) {
            console.error('Error fetching admin stats:', error);
            toast.error('Failed to load admin stats');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [user]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const formatTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    };

    if (!user) return null;

    return (
        <AppLayout>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">Admin Cockpit</h2>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Loading dashboard...</p>
                    </div>
                ) : (
                    <Tabs defaultValue="overview" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="services">Services</TabsTrigger>
                            <TabsTrigger value="activity">Activity</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Threads</CardTitle>
                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats?.stats.threads || 0}</div>
                                        <p className="text-xs text-muted-foreground">Chat conversations</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Documents</CardTitle>
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats?.stats.documents || 0}</div>
                                        <p className="text-xs text-muted-foreground">Knowledge base files</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Artifacts</CardTitle>
                                        <Code className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats?.stats.artifacts || 0}</div>
                                        <p className="text-xs text-muted-foreground">Generated code/docs</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Memory Vectors</CardTitle>
                                        <Database className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats?.stats.vectors || 0}</div>
                                        <p className="text-xs text-muted-foreground">Indexed in Qdrant</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Service Status</CardTitle>
                                        <CardDescription>Real-time status of Sovereign AI services</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Server className="h-4 w-4" />
                                                <span>Inference (Ollama)</span>
                                            </div>
                                            {stats?.services.inference === 'online' ? (
                                                <div className="flex items-center gap-1 text-green-500">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="text-sm">Online</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-red-500">
                                                    <XCircle className="h-4 w-4" />
                                                    <span className="text-sm">Offline</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Database className="h-4 w-4" />
                                                <span>Memory (Qdrant)</span>
                                            </div>
                                            {stats?.services.memory === 'online' ? (
                                                <div className="flex items-center gap-1 text-green-500">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="text-sm">Online</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-red-500">
                                                    <XCircle className="h-4 w-4" />
                                                    <span className="text-sm">Offline</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Recent Activity</CardTitle>
                                        <CardDescription>Latest thread updates</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                                            <div className="space-y-3">
                                                {stats.recentActivity.slice(0, 5).map((activity) => (
                                                    <div key={activity.id} className="flex items-center justify-between text-sm">
                                                        <span className="truncate max-w-[200px]">{activity.name}</span>
                                                        <span className="text-muted-foreground text-xs">
                                                            {formatTimeAgo(activity.updatedAt)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground text-sm">No recent activity</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="services">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Service Configuration</CardTitle>
                                    <CardDescription>Current infrastructure endpoints</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="p-4 rounded-lg border">
                                            <h4 className="font-medium mb-2">Inference Service</h4>
                                            <p className="text-sm text-muted-foreground font-mono">
                                                {process.env.NEXT_PUBLIC_INFERENCE_URL || 'Configured via server env'}
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-lg border">
                                            <h4 className="font-medium mb-2">Memory Service</h4>
                                            <p className="text-sm text-muted-foreground font-mono">
                                                {process.env.NEXT_PUBLIC_QDRANT_URL || 'Configured via server env'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="activity">
                            <Card>
                                <CardHeader>
                                    <CardTitle>All Recent Activity</CardTitle>
                                    <CardDescription>Thread updates from your account</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                                        <div className="space-y-2">
                                            {stats.recentActivity.map((activity) => (
                                                <div
                                                    key={activity.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                        <span>{activity.name}</span>
                                                    </div>
                                                    <span className="text-muted-foreground text-sm">
                                                        {new Date(activity.updatedAt).toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">No activity to display</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}

                {stats?.timestamp && (
                    <p className="text-xs text-muted-foreground text-center">
                        Last updated: {new Date(stats.timestamp).toLocaleString()}
                    </p>
                )}
            </div>
        </AppLayout>
    );
}
