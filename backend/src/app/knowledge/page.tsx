'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { KnowledgeUpload } from '@/components/settings/knowledge-upload';
import { useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Book, Upload, FileText, Smartphone, Trash2, Loader2, CheckCircle, Clock, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';

interface Document {
    id: string;
    filename: string;
    fileType: string;
    fileSize: number;
    chunkCount: number;
    status: 'processing' | 'completed' | 'failed';
    agentId: string;
    createdAt: string;
}

export default function KnowledgePage() {
    const { user } = useUser();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Fetch documents
    const fetchDocuments = React.useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/documents', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch documents');
            }

            const data = await response.json();
            setDocuments(data.documents || []);
        } catch (error: any) {
            console.error('Error fetching documents:', error);
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleDeleteDocument = async (documentId: string) => {
        if (!user) return;

        // Optimistic UI: Remove immediately from list
        setDocuments(prev => prev.filter(d => d.id !== documentId));
        toast.info('Deleting document...', { duration: 1000 }); // Short feedback

        try {
            const token = await user.getIdToken();
            const response = await fetch(`/api/documents?id=${documentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete document');
            }

            toast.success('Document permanently deleted');
        } catch (error: any) {
            console.error('Error deleting document:', error);
            toast.error('Failed to delete document');
            // Rollback: Re-fetch documents to restore the item
            fetchDocuments();
        } finally {
            setDeleting(null);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'processing':
                return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
            case 'failed':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <FileText className="h-4 w-4 text-muted-foreground" />;
        }
    };

    if (!user) return null;

    return (
        <AppLayout>
            <div className="flex-1 max-w-5xl mx-auto w-full py-12 md:py-20 px-8">
                <header className="mb-16">
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 mb-4 block underline decoration-primary/30 underline-offset-8">Information Vault</span>
                    <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground/90">Knowledge Library</h1>
                </header>

                <div className="flex flex-col gap-16">
                    <section className="space-y-8">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/20 mb-6">Ingestion Protocol</p>
                            <KnowledgeUpload userId={user.uid} agentId="universe" onUploadComplete={fetchDocuments} />
                        </div>
                    </section>

                    <section className="space-y-8">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/20">Stored Data Fragments ({documents.length})</p>
                            {loading && <Loader2 className="h-3 w-3 animate-spin text-foreground/20" />}
                        </div>

                        {loading && documents.length === 0 ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-12 w-full bg-foreground/[0.02] border-l border-foreground/5 animate-pulse" />
                                ))}
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="py-20 text-center border border-dashed border-border/10">
                                <p className="text-[11px] font-mono text-foreground/20 uppercase tracking-widest">No data fragments localized</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/5">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="group flex items-center justify-between py-4 transition-colors"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                                                {getStatusIcon(doc.status)}
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">{doc.filename}</p>
                                                <div className="flex items-center gap-3 text-[10px] text-foreground/30 font-mono mt-1">
                                                    <span>{doc.fileType.toUpperCase()}</span>
                                                    <span className="h-1 w-1 rounded-full bg-foreground/10"></span>
                                                    <span>{formatFileSize(doc.fileSize)}</span>
                                                    {doc.chunkCount > 0 && (
                                                        <>
                                                            <span className="h-1 w-1 rounded-full bg-foreground/10"></span>
                                                            <span>{doc.chunkCount} CHUNKS</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="text-[10px] font-mono text-foreground/20">
                                                {new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-foreground/20 hover:text-red-400/60 hover:bg-transparent"
                                                onClick={() => handleDeleteDocument(doc.id)}
                                                disabled={deleting === doc.id}
                                            >
                                                {deleting === doc.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3.5 w-3.5 stroke-[1]" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
