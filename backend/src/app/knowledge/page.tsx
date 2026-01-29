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
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-bold tracking-tight">Knowledge Library</h2>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-5 w-5 text-muted-foreground/50 cursor-help hover:text-primary transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-black/90 border-white/10 text-xs">
                                    <p>Central repository for all your documents and files. Content is indexed for AI retrieval.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <Tabs defaultValue="upload" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="upload" className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Upload
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Documents ({documents.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Add Knowledge</CardTitle>
                                <CardDescription>
                                    Upload documents (PDF, TXT, MD) to the Sovereign AI's long-term memory.
                                    Files are chunked, embedded, and indexed in Qdrant for semantic search.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <KnowledgeUpload userId={user.uid} agentId="universe" onUploadComplete={fetchDocuments} />
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Automatic Indexing</CardTitle>
                                    <Book className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">RAG Ready</div>
                                    <p className="text-xs text-muted-foreground">
                                        Content is immediately available for Retrieval Augmented Generation via the chat.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Supported Formats</CardTitle>
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">PDF, TXT, MD</div>
                                    <p className="text-xs text-muted-foreground">
                                        Support for more formats (DOCX, CSV, Notion) coming soon in Phase 8.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Mobile Uploads</CardTitle>
                                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">Enabled</div>
                                    <p className="text-xs text-muted-foreground">
                                        You can upload files directly from your mobile device via this dashboard.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Privacy & Security</CardTitle>
                                    <ShieldCheck className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">Encrypted</div>
                                    <p className="text-xs text-muted-foreground">
                                        Your data is stored in a private Qdrant collection. It is never shared with third parties.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="documents">
                        <Card>
                            <CardHeader>
                                <CardTitle>Indexed Documents</CardTitle>
                                <CardDescription>
                                    All documents currently indexed in your knowledge base.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                                                <Skeleton className="h-10 w-10 rounded-full" />
                                                <div className="space-y-2 flex-1">
                                                    <Skeleton className="h-4 w-[200px]" />
                                                    <Skeleton className="h-4 w-[150px]" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : documents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                        <Book className="h-12 w-12 mb-4 opacity-20" />
                                        <p>No documents uploaded yet.</p>
                                        <p className="text-sm">Use the Upload tab to add knowledge to your AI.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {documents.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {getStatusIcon(doc.status)}
                                                    <div>
                                                        <p className="font-medium">{doc.filename}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {doc.fileType.toUpperCase()} • {formatFileSize(doc.fileSize)}
                                                            {doc.chunkCount > 0 && ` • ${doc.chunkCount} chunks`}
                                                            {doc.status === 'processing' && ' • Processing...'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(doc.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleDeleteDocument(doc.id)}
                                                        disabled={deleting === doc.id}
                                                    >
                                                        {deleting === doc.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>
        </AppLayout>
    );
}
