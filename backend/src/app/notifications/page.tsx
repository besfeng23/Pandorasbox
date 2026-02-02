'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Bell,
    CheckCircle,
    AlertCircle,
    Info,
    FileText,
    Brain,
    Trash2,
    CheckCheck,
    Loader2
} from 'lucide-react';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Notification {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    category: 'system' | 'document' | 'memory' | 'chat';
}

export default function NotificationsPage() {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        // Simulate loading notifications - in production would fetch from API
        setLoading(true);
        setTimeout(() => {
            setNotifications([
                {
                    id: '1',
                    type: 'success',
                    title: 'Document Processed',
                    message: 'Your document "project-notes.pdf" has been successfully indexed with 24 chunks.',
                    read: false,
                    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                    category: 'document',
                },
                {
                    id: '2',
                    type: 'info',
                    title: 'Memory Consolidated',
                    message: 'The daily memory consolidation has completed. 12 new memories were validated.',
                    read: false,
                    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                    category: 'memory',
                },
                {
                    id: '3',
                    type: 'success',
                    title: 'System Online',
                    message: 'All Pandora AI services are operational.',
                    read: true,
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                    category: 'system',
                },
            ]);
            setLoading(false);
        }, 500);
    }, [user]);

    const getIcon = (type: string, category: string) => {
        if (category === 'document') return <FileText className="h-4 w-4" />;
        if (category === 'memory') return <Brain className="h-4 w-4" />;

        switch (type) {
            case 'success':
                return <CheckCircle className="h-4 w-4" />;
            case 'error':
                return <AlertCircle className="h-4 w-4" />;
            case 'warning':
                return <AlertCircle className="h-4 w-4" />;
            default:
                return <Info className="h-4 w-4" />;
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'success':
                return 'text-green-500 bg-green-500/10';
            case 'error':
                return 'text-red-500 bg-red-500/10';
            case 'warning':
                return 'text-amber-500 bg-amber-500/10';
            default:
                return 'text-blue-500 bg-blue-500/10';
        }
    };

    const formatTime = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        toast.success('All notifications marked as read');
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast.success('Notification deleted');
    };

    const clearAll = () => {
        setNotifications([]);
        toast.success('All notifications cleared');
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const unreadCount = notifications.filter(n => !n.read).length;

    if (!user) return null;

    return (
        <AppLayout>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell className="h-8 w-8 text-primary" />
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
                            {unreadCount > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                        >
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Mark all read
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearAll}
                            disabled={notifications.length === 0}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear all
                        </Button>
                    </div>
                </div>

                <div className="flex gap-2 mb-4">
                    <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('all')}
                    >
                        All ({notifications.length})
                    </Button>
                    <Button
                        variant={filter === 'unread' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('unread')}
                    >
                        Unread ({unreadCount})
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Updates about your documents, memories, and system status
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Bell className="h-12 w-12 text-muted-foreground/20 mb-4" />
                                <p className="text-muted-foreground">No notifications</p>
                                <p className="text-sm text-muted-foreground/60">
                                    {filter === 'unread' ? 'All caught up!' : 'Activity will appear here'}
                                </p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[500px]">
                                <div className="space-y-2">
                                    {filteredNotifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={cn(
                                                "flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer",
                                                notification.read
                                                    ? "bg-card hover:bg-muted/50"
                                                    : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                                            )}
                                            onClick={() => markAsRead(notification.id)}
                                        >
                                            <div className={cn(
                                                "p-2 rounded-lg shrink-0",
                                                getIconColor(notification.type)
                                            )}>
                                                {getIcon(notification.type, notification.category)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium text-sm">{notification.title}</p>
                                                    {!notification.read && (
                                                        <Badge variant="secondary" className="text-[10px] h-4">
                                                            New
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-muted-foreground/60 mt-2">
                                                    {formatTime(notification.createdAt)}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification.id);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
