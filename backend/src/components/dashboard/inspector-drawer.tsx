'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    X,
    Brain,
    FileText,
    Lightbulb,
    History,
    ExternalLink,
    Copy,
    Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';

interface ContextItem {
    id: string;
    type: 'memory' | 'document' | 'artifact';
    title: string;
    content: string;
    source?: string;
    score?: number;
    createdAt?: string;
}

interface InspectorDrawerProps {
    open: boolean;
    onClose: () => void;
    threadId?: string;
    className?: string;
    sources?: any[];
}

export function InspectorDrawer({ open, onClose, threadId, className, sources = [] }: InspectorDrawerProps) {
    const [activeTab, setActiveTab] = useState('context');
    const [contextItems, setContextItems] = useState<ContextItem[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    // Removed loading state as data is passed via props

    // Sync sources to context items
    useEffect(() => {
        if (sources && sources.length > 0) {
            const items: ContextItem[] = sources.map((s, i) => ({
                id: `src-${i}-${Date.now()}`,
                type: 'memory',
                title: s.title || 'Knowledge Source',
                content: s.snippet || 'No content preview available.',
                score: s.score,
                source: s.title,
                createdAt: new Date().toISOString()
            }));
            // Deduplicate by content or title? For now simple map.
            setContextItems(items);
        } else {
            setContextItems([]);
        }
    }, [sources]);

    const handleCopy = async (content: string, id: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'memory':
                return <Brain className="h-4 w-4" />;
            case 'document':
                return <FileText className="h-4 w-4" />;
            case 'artifact':
                return <Lightbulb className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'memory':
                return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'document':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'artifact':
                return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <SheetContent
                side="right"
                className={cn("w-[360px] sm:w-[400px] p-0", className)}
            >
                <SheetHeader className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-lg font-semibold">Inspector</SheetTitle>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <SheetDescription className="text-xs text-muted-foreground">
                        View context, sources, and related information
                    </SheetDescription>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6 h-12">
                        <TabsTrigger
                            value="context"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                        >
                            <Brain className="h-4 w-4 mr-2" />
                            Context
                        </TabsTrigger>
                        <TabsTrigger
                            value="sources"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Sources
                        </TabsTrigger>
                        <TabsTrigger
                            value="history"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                        >
                            <History className="h-4 w-4 mr-2" />
                            History
                        </TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[calc(100vh-180px)]">
                        <TabsContent value="context" className="p-6 space-y-4 mt-0">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-pulse text-muted-foreground">Loading context...</div>
                                </div>
                            ) : contextItems.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>No context retrieved yet.</p>
                                    <p className="text-xs mt-1">Context will appear here during conversations.</p>
                                </div>
                            ) : (
                                contextItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={cn("text-[10px] uppercase", getTypeColor(item.type))}
                                                >
                                                    {getTypeIcon(item.type)}
                                                    <span className="ml-1">{item.type}</span>
                                                </Badge>
                                                {item.score && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {Math.round(item.score * 100)}% match
                                                    </span>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => handleCopy(item.content, item.id)}
                                            >
                                                {copiedId === item.id ? (
                                                    <Check className="h-3 w-3 text-green-500" />
                                                ) : (
                                                    <Copy className="h-3 w-3" />
                                                )}
                                            </Button>
                                        </div>
                                        <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                                        <p className="text-xs text-muted-foreground line-clamp-3">
                                            {item.content}
                                        </p>
                                        {item.source && (
                                            <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                                                <ExternalLink className="h-3 w-3" />
                                                <span>{item.source}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="sources" className="p-6 mt-0">
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No sources cited.</p>
                                <p className="text-xs mt-1">Referenced documents will appear here.</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="p-6 mt-0">
                            <div className="text-center py-8 text-muted-foreground">
                                <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>Conversation history</p>
                                <p className="text-xs mt-1">View the full thread history here.</p>
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}

// Hook to manage inspector state
export function useInspectorDrawer() {
    const [isOpen, setIsOpen] = useState(false);
    const [threadId, setThreadId] = useState<string | undefined>();

    const open = (tid?: string) => {
        setThreadId(tid);
        setIsOpen(true);
    };

    const close = () => {
        setIsOpen(false);
    };

    return {
        isOpen,
        threadId,
        open,
        close,
    };
}
