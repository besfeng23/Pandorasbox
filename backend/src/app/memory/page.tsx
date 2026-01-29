'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { fetchMemories, deleteMemoryFromMemories, getKnowledgeGraph, updateMemoryType } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Brain, Trash2, Edit2, Play, Plus, Book, Filter, RefreshCw, Zap, Database, ShieldCheck, UserCircle, FileText, Sparkles, ArrowUpCircle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraphView } from '@/components/GraphView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface Memory {
  id: string;
  text: string;
  timestamp: string;
  score: number;
  payload?: any;
  type?: string;
}

const MEMORY_TYPES = [
  { id: 'all', label: 'All', icon: Database },
  { id: 'fact', label: 'Facts', icon: ShieldCheck },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'rule', label: 'Rules', icon: FileText },
  { id: 'consolidated_memory', label: 'Core', icon: Sparkles },
];

export default function MemoryPage() {
  const { user, loading: userLoading } = useUser();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[], edges: any[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [agentId, setAgentId] = useState<'builder' | 'universe'>('builder');

  const { toast } = useToast();

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
        score: m.score,
        payload: m.payload,
        type: m.payload?.type || 'normal'
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

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const handlePromoteToRule = async (item: Memory, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) return;
    try {
      // Promote to 'rule'
      const result = await updateMemoryType(item.id, 'rule', item.text, user.uid, agentId);
      if (result.success) {
        toast({ title: 'Promoted to Rule', description: 'This memory is now a governing directive.' });
        loadData();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Promotion Failed', description: error.message });
    }
  };

  const filteredMemories = memories.filter(m => {
    if (filterType === 'all') return true;
    if (filterType === 'fact') return m.type === 'fact';
    if (filterType === 'profile') return m.type === 'preference' || m.type === 'core_identity';
    if (filterType === 'rule') return m.type === 'rule';
    if (filterType === 'consolidated_memory') return m.type === 'consolidated_memory';
    return true;
  });

  if (userLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 p-8 space-y-8 max-w-5xl mx-auto w-full">
          <div className="space-y-4">
            <Skeleton className="h-12 w-48 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl h-full flex flex-col">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
              <Database className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  Memory Vault
                </h1>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground/50 cursor-help hover:text-cyan-400 transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-black/90 border-white/10 text-xs">
                      <p>Long-term vector storage for facts, rules, and user preferences (previously Neural Vault).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground font-mono">LONG-TERM VECTOR STORAGE</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="glass-panel border-white/10 hover:border-cyan-500/50" aria-label="Sync Real-time">
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Sync Real-time
            </Button>
          </div>
        </div>

        <Tabs defaultValue="list" className="flex-1 flex flex-col min-h-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 shrink-0">

            {/* Main View Tabs */}
            <TabsList className="bg-black/40 border border-white/10 p-1">
              <TabsTrigger value="list" className="px-6 flex items-center gap-2">
                <Database className="h-4 w-4" /> Archive
              </TabsTrigger>
              <TabsTrigger value="graph" className="px-6 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Knowledge Graph
              </TabsTrigger>
            </TabsList>

            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Query semantic index..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-black/40 border-white/10 text-sm focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>

          <TabsContent value="list" className="flex-1 flex flex-col min-h-0 outline-none">
            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {MEMORY_TYPES.map(type => {
                const Icon = type.icon;
                const isActive = filterType === type.id;
                const count = type.id === 'all'
                  ? memories.length
                  : memories.filter(m => {
                    if (type.id === 'fact') return m.type === 'fact';
                    if (type.id === 'profile') return m.type === 'preference' || m.type === 'core_identity';
                    if (type.id === 'rule') return m.type === 'rule';
                    if (type.id === 'consolidated_memory') return m.type === 'consolidated_memory';
                    return false;
                  }).length;

                return (
                  <button
                    key={type.id}
                    onClick={() => setFilterType(type.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      isActive
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {type.label}
                    <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] px-1 text-[9px] bg-black/50 border-white/10">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {/* List Content */}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4 flex-1">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
                  <Database className="h-6 w-6 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm text-cyan-400/60 font-mono animate-pulse">RECONSTRUCTING NEURAL PATHWAYS...</p>
              </div>
            ) : (
              <div className="overflow-y-auto pr-2 pb-10 flex-1">
                {filteredMemories.length === 0 ? (
                  <div className="text-center p-12 text-muted-foreground bg-white/5 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center max-w-2xl mx-auto mt-8">
                    <div className="h-16 w-16 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-cyan-500/20">
                      <Database className="h-8 w-8 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-headline font-bold text-white mb-2">Memory Vault Empty</h3>
                    <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                      {filterType === 'all'
                        ? "Your Sovereign AI hasn't formed any long-term memories yet. Memories are created automatically as you chat, or you can manually add important facts here."
                        : `No memories found in the '${MEMORY_TYPES.find(t => t.id === filterType)?.label}' category.`}
                    </p>

                    {filterType === 'all' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg text-left">
                        <div className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-cyan-500/30 transition-colors">
                          <div className="flex items-center gap-2 mb-2 text-cyan-400">
                            <Sparkles className="h-4 w-4" />
                            <span className="font-bold text-xs uppercase tracking-wider">Automatic</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Just chat with the Universe Agent. It will automatically detect and save important context.</p>
                        </div>
                        <div className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-cyan-500/30 transition-colors">
                          <div className="flex items-center gap-2 mb-2 text-cyan-400">
                            <FileText className="h-4 w-4" />
                            <span className="font-bold text-xs uppercase tracking-wider">Manual</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Use the input above to manually inject facts, rules, or preferences.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMemories.map((mem) => (
                      <Card
                        key={mem.id}
                        onClick={() => setSelectedNode(mem)}
                        className={cn(
                          "glass-panel border-white/5 hover:border-cyan-500/40 transition-all duration-300 group relative overflow-hidden cursor-pointer",
                          mem.type === 'rule' && "border-yellow-500/30 bg-yellow-500/5",
                          mem.type === 'core_identity' && "border-purple-500/30 bg-purple-500/5"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0 left-0 w-1 h-full transition-colors duration-500",
                          mem.type === 'rule' ? "bg-yellow-500/50" :
                            mem.type === 'core_identity' ? "bg-purple-500/50" :
                              "bg-cyan-500/20 group-hover:bg-cyan-500"
                        )} />

                        <CardHeader className="pb-2 pt-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              {mem.type === 'rule' && <Badge variant="outline" className="text-[9px] border-yellow-500/50 text-yellow-500 h-5">RULE</Badge>}
                              {mem.type === 'core_identity' && <Badge variant="outline" className="text-[9px] border-purple-500/50 text-purple-500 h-5">IDENTITY</Badge>}
                              <span className="text-[9px] font-mono text-muted-foreground/50">
                                ID_{mem.id.substring(0, 4)}
                              </span>
                            </div>
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              {/* Promote Button */}
                              {mem.type !== 'rule' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 opacity-0 group-hover:opacity-100 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all duration-300"
                                  title="Promote to Rule"
                                  aria-label="Promote to Rule"
                                  onClick={(e) => handlePromoteToRule(mem, e)}
                                >
                                  <ArrowUpCircle className="h-5 w-5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all duration-300"
                                onClick={(e) => handleDelete(mem.id, e)}
                                aria-label="Delete Memory"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-foreground/80 leading-relaxed font-sans line-clamp-4">
                            {mem.text}
                          </p>
                          <div className="mt-3 flex items-center justify-between text-[9px] text-muted-foreground uppercase tracking-wider">
                            <span>{mem.timestamp ? format(new Date(mem.timestamp), 'MMM dd') : 'NOW'}</span>
                            {mem.score > 0 && <span>Relevance: {Math.round(mem.score * 100)}%</span>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
          <DialogContent className="glass-panel border-cyan-500/40 sm:max-w-xl bg-black/95 backdrop-blur-2xl">
            <DialogHeader className="border-b border-white/5 pb-4">
              <DialogTitle className="text-cyan-400 flex items-center gap-3 text-lg font-bold">
                <div className="p-1.5 rounded-md bg-cyan-500/10">
                  <Database className="h-4 w-4" />
                </div>
                Memory Detail
              </DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedNode?.type === 'rule' && <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50">System Rule</Badge>}
                {selectedNode?.type === 'core_identity' && <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/50">Core Identity</Badge>}
                <Badge variant="outline">{selectedNode?.type || 'Standard Memory'}</Badge>
              </div>
              <div className="relative p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedNode?.text}
                </p>
              </div>

              {selectedNode?.timestamp && (
                <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                  <span>ID: {selectedNode.id}</span>
                  <span>Created: {format(new Date(selectedNode.timestamp), 'PP pp')}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              {selectedNode?.type !== 'rule' && (
                <Button variant="outline" size="sm" onClick={() => {
                  if (selectedNode) {
                    handlePromoteToRule(selectedNode);
                    setSelectedNode(null);
                  }
                }}>
                  <ArrowUpCircle className="mr-2 h-4 w-4 text-yellow-500" />
                  Promote to Rule
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => {
                if (selectedNode) {
                  handleDelete(selectedNode.id);
                  setSelectedNode(null);
                }
              }}>
                Delete Memory
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
