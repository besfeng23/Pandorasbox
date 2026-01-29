'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code, FileCode, Layout, Plus, Search, Trash2, Loader2, FileWarning } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useArtifactStore } from '@/store/artifacts';
import { Artifact } from '@/lib/types';
import { useUser } from '@/firebase';
import { toast } from 'sonner';

export default function ArtifactsPage() {
    const { user } = useUser();
    const { setActiveArtifact, setIsOpen } = useArtifactStore();
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);

    // Fetch artifacts from API
    useEffect(() => {
        async function fetchArtifacts() {
            if (!user) return;

            setLoading(true);
            try {
                const token = await user.getIdToken();
                const response = await fetch('/api/artifacts', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch artifacts');
                }

                const data = await response.json();
                setArtifacts(data.artifacts || []);
            } catch (error: any) {
                console.error('Error fetching artifacts:', error);
                toast.error('Failed to load artifacts');
            } finally {
                setLoading(false);
            }
        }

        fetchArtifacts();
    }, [user]);

    const handleOpenArtifact = (artifact: Artifact) => {
        setActiveArtifact(artifact);
        setIsOpen(true);
    };

    const handleDeleteArtifact = async (e: React.MouseEvent, artifactId: string) => {
        e.stopPropagation(); // Prevent opening the artifact
        if (!user) return;

        setDeleting(artifactId);
        try {
            const token = await user.getIdToken();
            const response = await fetch(`/api/artifacts?id=${artifactId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete artifact');
            }

            setArtifacts(prev => prev.filter(a => a.id !== artifactId));
            toast.success('Artifact deleted');
        } catch (error: any) {
            console.error('Error deleting artifact:', error);
            toast.error('Failed to delete artifact');
        } finally {
            setDeleting(null);
        }
    };

    // Filter artifacts by search query
    const filteredArtifacts = artifacts.filter(artifact =>
        artifact.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artifact.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!user) return null;

    return (
        <AppLayout>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Artifacts</h2>
                    <div className="flex items-center space-x-2">
                        <Button disabled>
                            <Plus className="mr-2 h-4 w-4" /> New Artifact
                        </Button>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search artifacts..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Loading artifacts...</p>
                    </div>
                ) : filteredArtifacts.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-12 border-dashed">
                        <FileWarning className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <CardTitle className="text-lg mb-2">No Artifacts Yet</CardTitle>
                        <CardDescription className="text-center max-w-md">
                            {searchQuery
                                ? `No artifacts match "${searchQuery}"`
                                : 'Artifacts are generated when you ask the Builder to create code, documents, or diagrams. Start a chat and ask it to build something!'}
                        </CardDescription>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredArtifacts.map((artifact) => (
                            <Card
                                key={artifact.id}
                                className="cursor-pointer hover:shadow-md transition-all group relative"
                                onClick={() => handleOpenArtifact(artifact)}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium truncate pr-8">{artifact.title}</CardTitle>
                                    <div className="flex items-center gap-2">
                                        {artifact.type === 'code' ? <FileCode className="h-4 w-4 text-muted-foreground" /> :
                                            artifact.type === 'markdown' ? <Layout className="h-4 w-4 text-muted-foreground" /> :
                                                <Code className="h-4 w-4 text-muted-foreground" />}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => handleDeleteArtifact(e, artifact.id)}
                                            disabled={deleting === artifact.id}
                                        >
                                            {deleting === artifact.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            )}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground mb-4">
                                        {artifact.language || artifact.type} • {artifact.createdAt ? new Date(artifact.createdAt).toLocaleDateString() : 'Unknown date'}
                                    </div>
                                    <div className="h-24 bg-muted/50 rounded-md p-2 overflow-hidden text-[10px] font-mono text-muted-foreground">
                                        {artifact.content.slice(0, 150)}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
