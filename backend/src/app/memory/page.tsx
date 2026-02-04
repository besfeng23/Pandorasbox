'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { useAuth } from '@/context/AuthContext';
import { Brain, Sparkles, Clock, Trash2, Filter, Search, Loader2, Database, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Memory {
  id: string;
  content: string;
  type: 'fact' | 'episodic';
  createdAt: string;
  agentId: string;
}

export default function MemoryPalacePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [filter, setFilter] = useState<'all' | 'fact' | 'episodic'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMemories = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/memory/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setMemories(data.memories);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load memories from the vault.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMemories();
    }
  }, [user]);

  const handleRunJanitor = async () => {
    if (!user || isCleaning) return;
    setIsCleaning(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/cron/janitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Securely authenticated via Firebase ID Token
        },
        body: JSON.stringify({ userId: user.uid }) // Redundant but kept for schema compatibility (ignored by backend if auth'd)
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Crystallization Complete',
          description: `Processed ${data.result.processedMemories} memories and created ${data.result.createdFacts} new facts.`,
        });
        fetchMemories();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Janitor Failed',
        description: error.message || 'Crystallization process encountered an error.',
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const filteredMemories = memories.filter(m => {
    const matchesFilter = filter === 'all' || m.type === filter;
    const matchesSearch = m.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-8 py-10 border-b border-border/40 bg-background/40 backdrop-blur-md z-10 shrink-0">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Brain className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
                  Memory Palace
                </h1>
              </div>
              <p className="text-muted-foreground text-sm max-w-xl">
                Explore and manage the agent&apos;s long-term memory. Crystallize conversations into persistent knowledge.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRunJanitor}
                disabled={isCleaning}
                className={cn(
                  "relative group px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 overflow-hidden",
                  isCleaning
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:shadow-[0_0_20px_rgba(var(--primary),0.4)] active:scale-95"
                )}
              >
                {isCleaning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Cleaning Vault...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span>Run Janitor</span>
                  </>
                )}
                {/* Visual accent */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="max-w-6xl mx-auto mt-8 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                placeholder="Search your memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted/30 border border-border/50 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border/50">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                  filter === 'all' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilter('fact')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                  filter === 'fact' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Facts
              </button>
              <button
                onClick={() => setFilter('episodic')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                  filter === 'episodic' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Episodic
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-zinc-950/20">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">Syncing Neural Pathway</p>
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="p-4 rounded-full bg-muted/20 border border-border/50">
                  <Database className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">No memories found</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    {searchQuery ? "No results match your search." : "Your memory vault is currently empty. Start chatting to create some memories!"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredMemories.map((memory, index) => (
                    <motion.div
                      key={memory.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={cn(
                        "group relative flex flex-col p-6 rounded-2xl border transition-all hover:shadow-xl",
                        memory.type === 'fact'
                          ? "bg-primary/5 border-primary/20"
                          : "bg-card/40 border-border/40 hover:bg-card/60"
                      )}
                    >
                      {/* Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          memory.type === 'fact'
                            ? "bg-primary/20 text-primary border-primary/30"
                            : "bg-muted/40 text-muted-foreground border-border"
                        )}>
                          {memory.type}
                        </div>
                        <div className="text-[10px] items-center flex gap-1.5 text-muted-foreground/60 font-medium">
                          <Clock className="w-3 h-3" />
                          {memory.createdAt ? formatDistanceToNow(new Date(memory.createdAt)) + ' ago' : 'long ago'}
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-sm leading-relaxed mb-6 flex-1 text-foreground/90 font-medium">
                        {memory.content}
                      </p>

                      {/* Footer Info */}
                      <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                            <Zap className="w-2 h-2 text-muted-foreground" />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tighter">
                            Agent: {memory.agentId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Fact Icon Accessory */}
                      {memory.type === 'fact' && (
                        <div className="absolute -top-1 -right-1">
                          <div className="p-1 rounded-full bg-primary shadow-sm">
                            <ShieldCheck className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
