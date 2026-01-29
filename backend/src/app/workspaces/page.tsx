'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Building, ShieldCheck, Loader2, PlusCircle, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Workspace } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function WorkspacesPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [creating, setCreating] = useState(false);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('activeWorkspaceId');
        if (stored) setActiveWorkspaceId(stored);
        fetchWorkspaces();
    }, [user]);

    const fetchWorkspaces = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/workspaces', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.workspaces) {
                setWorkspaces(data.workspaces);
            }
        } catch (error) {
            console.error('Fetch Workspaces Error:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load workspaces.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newName) return;
        setCreating(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newName, description: newDesc })
            });
            const data = await response.json();
            if (data.id) {
                toast({ title: 'Workspace Created', description: `Successfully created ${newName}` });
                setNewName('');
                setNewDesc('');
                setIsCreateOpen(false);
                fetchWorkspaces();
            }
        } catch (error) {
            console.error('Create Workspace Error:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to create workspace.'
            });
        } finally {
            setCreating(false);
        }
    };

    const switchWorkspace = (id: string | null) => {
        setActiveWorkspaceId(id);
        if (id) {
            localStorage.setItem('activeWorkspaceId', id);
        } else {
            localStorage.removeItem('activeWorkspaceId');
        }
        toast({ title: 'Workspace Switched', description: 'Your active environment has been updated.' });
    };

    return (
        <AppLayout>
            <div className="flex-1 space-y-6 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-bold tracking-tight">Workspaces</h2>
                        <p className="text-sm text-muted-foreground">Manage your isolated Sovereign AI environments.</p>
                    </div>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> New Workspace
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <form onSubmit={handleCreate}>
                                <DialogHeader>
                                    <DialogTitle>Create Workspace</DialogTitle>
                                    <DialogDescription>
                                        Create a new isolated environment for your documents and chat threads.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Workspace Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. Research Project"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                            id="description"
                                            placeholder="Optional details..."
                                            value={newDesc}
                                            onChange={(e) => setNewDesc(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={creating}>
                                        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Workspace
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Personal Workspace (Default) */}
                    <Card
                        className={cn(
                            "cursor-pointer transition-all hover:border-primary/50",
                            activeWorkspaceId === null && "border-primary ring-1 ring-primary/20 bg-primary/5"
                        )}
                        onClick={() => switchWorkspace(null)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Personal Vault</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-2xl font-bold">Standard</div>
                                {activeWorkspaceId === null && (
                                    <Badge variant="default" className="bg-primary/20 text-primary border-primary/20">Active</Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Your private, non-shared Sovereign AI environment.
                            </p>
                        </CardContent>
                    </Card>

                    {/* User Created Workspaces */}
                    {loading ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        workspaces.map((ws) => (
                            <Card
                                key={ws.id}
                                className={cn(
                                    "cursor-pointer transition-all hover:border-primary/50",
                                    activeWorkspaceId === ws.id && "border-primary ring-1 ring-primary/20 bg-primary/5"
                                )}
                                onClick={() => switchWorkspace(ws.id)}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{ws.name}</CardTitle>
                                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="text-2xl font-bold">Custom</div>
                                        {activeWorkspaceId === ws.id && (
                                            <Badge variant="default" className="bg-primary/20 text-primary border-primary/20">Active</Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                        {ws.description || 'Isolated project workspace.'}
                                    </p>
                                </CardContent>
                            </Card>
                        ))
                    )}

                    {/* Team Template (Static) */}
                    <Card className="opacity-60 border-dashed">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Team Workspace</CardTitle>
                            <Building className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Coming Soon</div>
                            <p className="text-xs text-muted-foreground">
                                Invite collaborators to share memories and artifacts.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Sovereign Isolation Matrix
                        </CardTitle>
                        <CardDescription>Each workspace maintains strict cryptographic and semantic isolation.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 rounded-xl border bg-card/50">
                            <p className="font-semibold text-sm mb-1">Semantic Sandboxing</p>
                            <p className="text-xs text-muted-foreground">Vector embeddings and LLM context are strictly filtered by workspace ID. One workspace cannot "hear" another.</p>
                        </div>
                        <div className="p-4 rounded-xl border bg-card/50">
                            <p className="font-semibold text-sm mb-1">Independent Pipelines</p>
                            <p className="text-xs text-muted-foreground">Document processing and memory consolidation runs in separate, isolated worker threads per tenant.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
