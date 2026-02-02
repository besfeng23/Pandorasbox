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
            <div className="flex-1 max-w-6xl mx-auto w-full py-12 md:py-20 px-8">
                <header className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div className="space-y-4">
                        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 block underline decoration-primary/30 underline-offset-8">Signal Flow</span>
                        <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground/90 flex items-center gap-6">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="text-[11px] font-mono text-primary bg-primary/5 px-3 py-1 border border-primary/10 tracking-widest uppercase tabular-nums">
                                    {unreadCount} UNREAD_FLAGS
                                </span>
                            )}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                            className="h-10 rounded-none border-foreground/5 bg-transparent text-[10px] font-bold uppercase tracking-widest hover:border-primary/40 hover:bg-primary/5 transition-all shadow-none px-6"
                        >
                            <CheckCheck className="h-4 w-4 mr-3 stroke-[1.5]" />
                            Sync Signal State
                        </Button>
                        <Button
                            variant="outline"
                            onClick={clearAll}
                            disabled={notifications.length === 0}
                            className="h-10 rounded-none border-foreground/5 bg-transparent text-[10px] font-bold uppercase tracking-widest hover:border-red-400/40 hover:bg-red-400/5 transition-all shadow-none px-6"
                        >
                            <Trash2 className="h-4 w-4 mr-3 stroke-[1.5]" />
                            Clear Feed
                        </Button>
                    </div>
                </header>

                <nav className="flex gap-8 mb-16 border-b border-foreground/5">
                    <button
                        onClick={() => setFilter('all')}
                        className={cn(
                            "pb-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all border-b-2",
                            filter === 'all'
                                ? "text-primary border-primary shadow-[0_4px_0_-2px_rgba(0,122,255,0.4)]"
                                : "text-foreground/20 border-transparent hover:text-foreground/40"
                        )}
                    >
                        Index_Full ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={cn(
                            "pb-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all border-b-2",
                            filter === 'unread'
                                ? "text-primary border-primary shadow-[0_4px_0_-2px_rgba(0,122,255,0.4)]"
                                : "text-foreground/20 border-transparent hover:text-foreground/40"
                        )}
                    >
                        Active_Signals ({unreadCount})
                    </button>
                </nav>

                <div className="space-y-px bg-border/5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-background border border-border/5">
                            <Loader2 className="h-8 w-8 animate-spin text-foreground/10 stroke-[1]" />
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 bg-background border border-border/5 text-center gap-6">
                            <Bell className="h-12 w-12 text-foreground/5 stroke-[1]" />
                            <div className="space-y-1">
                                <p className="text-[13px] font-medium text-foreground/20 uppercase tracking-widest">Feed Exhausted</p>
                                <p className="text-[10px] text-foreground/10 font-mono tracking-tighter uppercase">
                                    {filter === 'unread' ? '[ALL_SIGNAL_MAPPING_COMPLETE]' : '[NO_ACTIVITY_LOGGED]'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-px">
                            {filteredNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "group flex items-start gap-8 p-10 bg-background border border-border/5 transition-all duration-500",
                                        !notification.read ? "bg-primary/[0.01] border-primary/10" : "hover:bg-foreground/[0.01]"
                                    )}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className={cn(
                                        "p-4 border shrink-0 transition-colors flex items-center justify-center h-12 w-12",
                                        !notification.read ? "bg-primary/5 border-primary/20 text-primary" : "bg-foreground/[0.03] border-foreground/5 text-foreground/20"
                                    )}>
                                        {getIcon(notification.type, notification.category)}
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-3">
                                        <div className="flex items-center gap-4">
                                            <h4 className="text-[15px] font-medium text-foreground/80 group-hover:text-foreground transition-colors tabular-nums tracking-tight">
                                                {notification.title}
                                            </h4>
                                            {!notification.read && (
                                                <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 rounded-none uppercase tracking-widest">
                                                    Unread_Signal
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[12px] text-foreground/40 leading-relaxed max-w-2xl border-l border-foreground/5 pl-6 ml-1">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-6 pt-2">
                                            <span className="text-[10px] text-foreground/20 font-mono uppercase tracking-widest">
                                                T_DELAY: {formatTime(notification.createdAt).toUpperCase()}
                                            </span>
                                            <span className="text-[10px] text-foreground/20 font-mono uppercase tracking-widest px-2 bg-foreground/[0.03]">
                                                TAG: {notification.category}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-foreground/20 hover:text-red-400 hover:bg-red-400/5 transition-all opacity-0 group-hover:opacity-100 rounded-none shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(notification.id);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4 stroke-[1.5]" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
