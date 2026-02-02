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
            <div className="flex-1 max-w-6xl mx-auto w-full py-12 md:py-20 px-8">
                <header className="mb-16 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 mb-4 block underline decoration-primary/30 underline-offset-8">Containment Units</span>
                        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground/90">Workspaces</h1>
                    </div>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-10 rounded-none bg-primary text-white text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all border-none font-sans">
                                <PlusCircle className="mr-2 h-3.5 w-3.5 stroke-[1.5]" /> New Cluster
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-none border-border/10 bg-background/95 backdrop-blur-xl max-w-md p-10">
                            <form onSubmit={handleCreate}>
                                <DialogHeader className="space-y-4">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60">Cluster Generation</span>
                                    <DialogTitle className="text-2xl font-light tracking-tight text-foreground/90">Instantiate Workspace</DialogTitle>
                                    <DialogDescription className="text-xs text-foreground/40 leading-relaxed">
                                        Carve out a new isolated semantic environment. Data fragments within this cluster will be cryptographically bound.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-8 space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Identifier</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. PROJECT_VOID"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="rounded-none border-0 border-b border-border/10 bg-foreground/[0.02] focus-visible:ring-0 focus-visible:border-primary/40 text-[13px] h-10 transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Descriptor</Label>
                                        <Input
                                            id="description"
                                            placeholder="Optional metadata..."
                                            value={newDesc}
                                            onChange={(e) => setNewDesc(e.target.value)}
                                            className="rounded-none border-0 border-b border-border/10 bg-foreground/[0.02] focus-visible:ring-0 focus-visible:border-primary/40 text-[13px] h-10 transition-all"
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="flex-col sm:flex-col gap-3">
                                    <Button type="submit" disabled={creating} className="w-full h-12 rounded-none bg-primary text-white text-[11px] font-bold uppercase tracking-widest hover:bg-primary/90">
                                        {creating ? <Loader2 className="h-4 w-4 animate-spin stroke-[1]" /> : 'Authorize Generation'}
                                    </Button>
                                    <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="w-full h-10 rounded-none text-[10px] font-bold uppercase tracking-widest text-foreground/30 hover:bg-foreground/5">
                                        Abort
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </header>

                <div className="grid gap-px bg-border/5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {/* Personal Workspace (Default) */}
                    <div
                        className={cn(
                            "group relative p-10 bg-background border border-border/5 transition-all duration-500 hover:border-primary/20",
                            activeWorkspaceId === null && "bg-primary/[0.01] border-primary/20"
                        )}
                        onClick={() => switchWorkspace(null)}
                    >
                        <div className="flex flex-col h-full gap-8">
                            <div className="flex items-start justify-between">
                                <div className={cn(
                                    "p-3 transition-colors",
                                    activeWorkspaceId === null ? "text-primary bg-primary/5" : "text-foreground/20 bg-foreground/[0.03]"
                                )}>
                                    <ShieldCheck className="h-5 w-5 stroke-[1]" />
                                </div>
                                {activeWorkspaceId === null && (
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-primary">Active Endpoint</span>
                                )}
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-[15px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">Personal Vault</h3>
                                <p className="text-[11px] text-foreground/30 leading-relaxed italic border-l border-foreground/5 pl-4 ml-1">
                                    Standard non-volatile environment for personal data processing.
                                </p>
                            </div>
                            <div className="mt-auto">
                                <span className="text-[9px] font-mono text-foreground/20 tracking-widest">S_ID: ROOT_Personal</span>
                            </div>
                        </div>
                    </div>

                    {/* User Created Workspaces */}
                    {loading ? (
                        <div className="p-10 flex flex-col items-center justify-center border border-border/5 bg-background">
                            <Loader2 className="h-6 w-6 animate-spin text-foreground/10" />
                        </div>
                    ) : (
                        workspaces.map((ws) => (
                            <div
                                key={ws.id}
                                className={cn(
                                    "group relative p-10 bg-background border border-border/5 transition-all duration-500 hover:border-primary/20",
                                    activeWorkspaceId === ws.id && "bg-primary/[0.01] border-primary/20"
                                )}
                                onClick={() => switchWorkspace(ws.id)}
                            >
                                <div className="flex flex-col h-full gap-8">
                                    <div className="flex items-start justify-between">
                                        <div className={cn(
                                            "p-3 transition-colors",
                                            activeWorkspaceId === ws.id ? "text-primary bg-primary/5" : "text-foreground/20 bg-foreground/[0.03]"
                                        )}>
                                            <LayoutDashboard className="h-5 w-5 stroke-[1]" />
                                        </div>
                                        {activeWorkspaceId === ws.id && (
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-primary">Active Endpoint</span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-[15px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">{ws.name}</h3>
                                        <p className="text-[11px] text-foreground/30 leading-relaxed line-clamp-2 border-l border-foreground/5 pl-4 ml-1">
                                            {ws.description || 'Isolated project cluster.'}
                                        </p>
                                    </div>
                                    <div className="mt-auto">
                                        <span className="text-[9px] font-mono text-foreground/20 tracking-widest">S_ID: {ws.id.substring(0, 12).toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Add Workspace Action */}
                    <div
                        className="group relative p-10 bg-background border border-dashed border-border/10 transition-all duration-500 hover:border-primary/20 hover:bg-foreground/[0.01] cursor-pointer flex flex-col items-center justify-center text-center gap-6"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        <div className="h-12 w-12 border border-foreground/5 rounded-none flex items-center justify-center bg-foreground/[0.02] group-hover:border-primary/20 transition-colors">
                            <PlusCircle className="h-6 w-6 text-foreground/20 group-hover:text-primary transition-colors stroke-[1]" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[13px] font-medium text-foreground/40 group-hover:text-foreground transition-colors uppercase tracking-widest">Generate Cluster</p>
                            <p className="text-[10px] text-foreground/20 tracking-tight">Expand the isolation matrix</p>
                        </div>
                    </div>
                </div>

                <section className="mt-20 pt-16 border-t border-border/5">
                    <div className="flex items-center gap-4 mb-10">
                        <ShieldCheck className="h-4 w-4 text-primary stroke-[1.5]" />
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-foreground/30">Isolation Protocols (Zero-G Spec)</h2>
                    </div>
                    <div className="grid gap-px bg-border/5 grid-cols-1 md:grid-cols-2">
                        <div className="p-8 bg-foreground/[0.01] border-l border-primary/20">
                            <h4 className="text-[14px] font-medium text-foreground/80 mb-3">Cryptographic Sharding</h4>
                            <p className="text-[11px] text-foreground/40 leading-relaxed">
                                Vector embeddings and LLM context are strictly filtered by workspace ID. One workspace cannot perceive the neural fragments of another.
                            </p>
                        </div>
                        <div className="p-8 bg-foreground/[0.01] border-l border-primary/20">
                            <h4 className="text-[14px] font-medium text-foreground/80 mb-3">Process Isolation</h4>
                            <p className="text-[11px] text-foreground/40 leading-relaxed">
                                Document processing and memory consolidation runs in separate, isolated worker containers per environment, ensuring no leakage.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
