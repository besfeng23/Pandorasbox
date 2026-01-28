'use client';

import React from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code, FileCode, Layout, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useArtifactStore } from '@/store/artifacts';
import { Artifact } from '@/lib/types';

const DEMO_ARTIFACTS: Artifact[] = [
    {
        id: '1',
        title: 'Sovereign AI Architecture',
        type: 'markdown',
        content: '# Architecture\n\n- vLLM\n- Qdrant\n- Next.js',
        language: 'markdown',
        createdAt: new Date()
    },
    {
        id: '2',
        title: 'React Component: Button',
        type: 'code',
        content: 'export function Button() { return <button>Click me</button> }',
        language: 'tsx',
        createdAt: new Date()
    },
    {
        id: '3',
        title: 'Landing Page Mockup',
        type: 'html',
        content: '<div class="hero">Welcome</div>',
        language: 'html',
        createdAt: new Date()
    }
];

export default function ArtifactsPage() {
    const { setActiveArtifact, setIsOpen } = useArtifactStore();

    const handleOpenArtifact = (artifact: Artifact) => {
        setActiveArtifact(artifact);
        setIsOpen(true);
    };

    return (
        <AppLayout>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Artifacts</h2>
                    <div className="flex items-center space-x-2">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Artifact
                        </Button>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search artifacts..." className="pl-8" />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {DEMO_ARTIFACTS.map((artifact) => (
                        <Card key={artifact.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => handleOpenArtifact(artifact)}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium truncate">{artifact.title}</CardTitle>
                                {artifact.type === 'code' ? <FileCode className="h-4 w-4 text-muted-foreground" /> :
                                    artifact.type === 'markdown' ? <Layout className="h-4 w-4 text-muted-foreground" /> :
                                        <Code className="h-4 w-4 text-muted-foreground" />}
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground mb-4">
                                    {artifact.language} • {artifact.createdAt?.toLocaleDateString()}
                                </div>
                                <div className="h-24 bg-muted/50 rounded-md p-2 overflow-hidden text-[10px] font-mono text-muted-foreground">
                                    {artifact.content.slice(0, 150)}
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Placeholder for empty state or more artifacts */}
                    <Card className="flex flex-col items-center justify-center p-6 border-dashed h-[180px]">
                        <div className="text-center text-muted-foreground">
                            <p>Artifact persistence is coming soon.</p>
                            <p className="text-xs">Generated artifacts will appear here.</p>
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
