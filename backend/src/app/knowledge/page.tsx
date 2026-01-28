'use client';

import React from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { KnowledgeUpload } from '@/components/settings/knowledge-upload';
import { useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, Upload, FileText, Smartphone } from 'lucide-react';

export default function KnowledgePage() {
    const { user } = useUser();

    if (!user) return null;

    return (
        <AppLayout>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Knowledge Base</h2>
                </div>

                <Tabs defaultValue="upload" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="upload" className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Upload
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Documents
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
                                <KnowledgeUpload userId={user.uid} agentId="universe" />
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
                        </div>
                    </TabsContent>

                    <TabsContent value="documents">
                        <Card>
                            <CardHeader>
                                <CardTitle>Indexed Documents</CardTitle>
                                <CardDescription>
                                    A list of all documents currently indexed in your knowledge base.
                                    (Document management coming in Phase 5)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                    <Book className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Document list view requires new backend API endpoints.</p>
                                    <p className="text-sm">Check the "Memory" tab to see individual vector chunks.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>
        </AppLayout>
    );
}
