'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { fetchMemories, deleteMemoryFromMemories, getKnowledgeGraph } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2, Search, Database, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraphView } from '@/components/GraphView';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

interface Memory {
  id: string;
  text: string;
  timestamp: string;
  score: number;
}

export default function MemoryPage() {
  const { user, loading: userLoading } = useUser();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[], edges: any[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const { toast } = useToast();
  const [agentId, setAgentId] = useState<'builder' | 'universe'>('builder');

  useEffect(() => {
    const storedAgentId = localStorage.getItem('agentId') as 'builder' | 'universe';
    if (storedAgentId) setAgentId(storedAgentId);
  }, []);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const memoryData = await fetchMemories(user.uid, agentId, search);
      setMemories(memoryData.map(m => ({
        id: m.id,
        text: m.text,
        timestamp: m.timestamp,
        score: m.score
      })));

      const gData = await getKnowledgeGraph(user.uid, agentId);
      setGraphData(gData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load memory data.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, agentId, search]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const result = await deleteMemoryFromMemories(id, user.uid, agentId);
      if (result.success) {
        toast({ title: 'Memory deleted' });
        loadData();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete memory',
      });
    }
  };

  if (userLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl h-full flex flex-col">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-cyan-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent underline decoration-cyan-500/20 underline-offset-8">
              Memory Vault
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="glass-panel border-white/10 hover:border-cyan-500/50">
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Sync Real-time
            </Button>
          </div>
        </div>

        <Tabs defaultValue="list" className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 shrink-0 px-2">
            <TabsList className="bg-black/40 border border-white/10 p-1">
              <TabsTrigger value="list" className="px-6">Archive</TabsTrigger>
              <TabsTrigger value="graph" className="px-6">Knowledge Graph</TabsTrigger>
            </TabsList>

            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Query semantic index..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-black/40 border-white/10 text-sm focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>

          <TabsContent value="list" className="flex-1 overflow-y-auto no-scrollbar outline-none">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
                  <Database className="h-6 w-6 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm text-cyan-400/60 font-mono animate-pulse">RECONSTRUCTING NEURAL PATHWAYS...</p>
              </div>
            ) : (
              <div className="grid gap-4 pb-8">
                {memories.length === 0 ? (
                  <div className="text-center p-16 text-muted-foreground bg-black/40 rounded-2xl border border-dashed border-white/10">
                    <Database className="h-12 w-12 mx-auto mb-4 text-white/10" />
                    <p className="text-lg font-medium text-white/40">The vault is empty.</p>
                    <p className="text-sm mt-2">Engage with Pandora to begin knowledge synthesis.</p>
                  </div>
                ) : (
                  memories.map((mem) => (
                    <Card key={mem.id} className="glass-panel border-white/5 hover:border-cyan-500/40 transition-all duration-500 group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/20 group-hover:bg-cyan-500 transition-colors duration-500" />
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-[10px] font-mono text-cyan-500/50 tracking-tighter">
                            ID_{mem.id.replace(/-/g, '').substring(0, 16).toUpperCase()}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all duration-300 -translate-y-1 group-hover:translate-y-0"
                            onClick={() => handleDelete(mem.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-foreground/90 leading-relaxed font-sans">{mem.text}</p>
                        <div className="mt-4 flex items-center gap-6 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
                          <span className="flex items-center gap-1.5">
                            <RefreshCw className="h-3 w-3 text-cyan-500/50" />
                            {mem.timestamp ? format(new Date(mem.timestamp), 'MMM dd | HH:mm') : 'REALTIME'}
                          </span>
                          <span className="text-cyan-500/60 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
                            SCORE: {mem.score.toFixed(3)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="graph" className="flex-1 min-h-[500px] outline-none group/graph relative">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent opacity-0 group-hover/graph:opacity-100 transition-opacity duration-1000" />
            <GraphView
              nodes={graphData.nodes}
              edges={graphData.edges}
              onNodeClick={(node) => {
                const fullMem = memories.find(m => m.id === node.id);
                setSelectedNode(fullMem || { text: node.label });
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Node Detail Dialog */}
        <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
          <DialogContent className="glass-panel border-cyan-500/40 sm:max-w-2xl bg-black/90 backdrop-blur-2xl">
            <DialogHeader className="border-b border-white/5 pb-4">
              <DialogTitle className="text-cyan-400 flex items-center gap-3 text-xl font-bold tracking-tight">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Database className="h-5 w-5" />
                </div>
                Extracted Wisdom
              </DialogTitle>
            </DialogHeader>
            <div className="py-8">
              <div className="relative">
                <div className="absolute -left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 to-transparent" />
                <p className="text-lg text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans pl-4">
                  {selectedNode?.text}
                </p>
              </div>

              {selectedNode?.timestamp && (
                <div className="mt-10 flex items-center justify-between border-t border-white/5 pt-6">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                    Captured on {format(new Date(selectedNode.timestamp), 'PPP')} at {format(new Date(selectedNode.timestamp), 'p')}
                  </div>
                  <div className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-tighter">
                    Sovereign System v2.0
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
