'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { fetchMemories, deleteMemoryFromMemories } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2, Search, Database, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AppLayout } from '@/components/dashboard/app-layout';
import { PageHeader, PageShell } from '@/components/ui/page-shell';
import { StateBlock } from '@/components/ui/state-block';

interface Memory {
  id: string;
  text: string;
  timestamp: string;
  score: number;
}

export default function MemoryPage() {
  const { user, loading: userLoading } = useUser();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const [agentId, setAgentId] = useState<'builder' | 'universe'>('builder');

  useEffect(() => {
    const storedAgentId = localStorage.getItem('agentId') as 'builder' | 'universe';
    if (storedAgentId) setAgentId(storedAgentId);
  }, []);

  const loadMemories = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchMemories(user.uid, agentId, search);
      setMemories(
        data.map((m) => ({
          id: m.id,
          text: m.text,
          timestamp: m.timestamp,
          score: m.score,
        }))
      );
    } catch (error) {
      console.error('Failed to load memories:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load memories. Check connection.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadMemories();
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
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to delete memory' });
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
      <PageShell>
        <PageHeader
          title="Memory Dashboard"
          description="Browse and manage indexed memories generated from your conversations."
          actions={
            <Button variant="outline" onClick={loadMemories} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          }
        />

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search memories..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : memories.length === 0 ? (
          <StateBlock
            icon={<Database className="h-7 w-7" />}
            title="No memories found"
            description="Chat with Pandora to create memories, or adjust your search query."
          />
        ) : (
          <div className="grid gap-3">
            {memories.map((mem) => (
              <Card key={mem.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">Memory {mem.id.substring(0, 8)}…</CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(mem.id)} aria-label="Delete memory">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{mem.text}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {mem.timestamp ? format(new Date(mem.timestamp), 'PPP p') : 'Unknown Date'}
                    <span className="ml-2">Score: {mem.score.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageShell>
    </AppLayout>
  );
}
