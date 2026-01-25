'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { AuthGuard } from '@/components/auth/auth-guard';
import { getMemories, deleteMemoryFromMemories } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2, Search, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Memory {
  id: string;
  content: string;
  createdAt: any;
  source?: string;
}

export default function MemoryPage() {
  const { user } = useUser();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const [agentId, setAgentId] = useState<'builder' | 'universe'>('builder');

  useEffect(() => {
    // Sync agentId from local storage or default
    const storedAgentId = localStorage.getItem('agentId') as 'builder' | 'universe';
    if (storedAgentId) setAgentId(storedAgentId);
  }, []);

  const loadMemories = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getMemories(user.uid, agentId, search);
      setMemories(data as any[]);
    } catch (error) {
      console.error('Failed to load memories:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load memories. Check connection.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [user, agentId, search]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const result = await deleteMemoryFromMemories(id, user.uid, agentId);
      if (result.success) {
        toast({ title: 'Memory deleted' });
        loadMemories();
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

  return (
    <AuthGuard>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-cyan-400" />
                <h1 className="text-3xl font-bold neon-text-cyan">Memory Dashboard</h1>
            </div>
            <div className="flex gap-2">
                 <Button variant="outline" onClick={loadMemories} disabled={loading}>
                    Refresh
                 </Button>
            </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search memories..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/20 border-cyan-500/30"
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="grid gap-4">
            {memories.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground">
                No memories found. Chat with Pandora to create new memories.
              </div>
            ) : (
              memories.map((mem) => (
                <Card key={mem.id} className="glass-panel border-cyan-500/20">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm font-medium text-cyan-300">
                        {mem.source || 'Conversation'}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => handleDelete(mem.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{mem.content}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {mem.createdAt?.seconds ? format(new Date(mem.createdAt.seconds * 1000), 'PPP p') : 'Unknown Date'}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

