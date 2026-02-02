import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, PlusCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { fetchMemories, deleteMemoryFromMemories, updateMemoryInMemories, createMemoryFromSettings } from '@/app/actions';
import { toast } from 'sonner';

interface Memory {
  id: string;
  content: string;
  createdAt: string;
  source: string;
}

interface MemoryTableProps {
  userId: string;
}

export function MemoryTable({ userId }: MemoryTableProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState('');
  const agentId = 'universe'; // Assuming a default agentId for memory management

  const loadMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedResults = await fetchMemories(userId, agentId, ''); // Fetch all memories (returns SearchResult[])
      // Map SearchResult to Memory
      const mappedMemories: Memory[] = fetchedResults.map(res => ({
        id: res.id,
        content: res.text,
        createdAt: res.timestamp,
        source: 'manual' // Default or infer from timestamp/metadata
      }));
      setMemories(mappedMemories);
    } catch (err: any) {
      console.error('Failed to fetch memories:', err);
      setError(err.message || 'Failed to load memories.');
      toast.error(err.message || 'Failed to load memories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadMemories();
    }
  }, [userId]);

  const handleDelete = async (memoryId: string) => {
    try {
      await deleteMemoryFromMemories(memoryId, userId, agentId);
      toast.success('Memory deleted successfully.');
      loadMemories();
    } catch (err: any) {
      console.error('Failed to delete memory:', err);
      toast.error(err.message || 'Failed to delete memory.');
    }
  };

  const handleUpdate = async (memoryId: string) => {
    if (!editingMemoryContent.trim()) {
      toast.error('Memory content cannot be empty.');
      return;
    }
    try {
      await updateMemoryInMemories(memoryId, editingMemoryContent, userId, agentId);
      toast.success('Memory updated successfully.');
      setEditingMemoryId(null);
      setEditingMemoryContent('');
      loadMemories();
    } catch (err: any) {
      console.error('Failed to update memory:', err);
      toast.error(err.message || 'Failed to update memory.');
    }
  };

  const handleCreate = async () => {
    if (!newMemoryContent.trim()) {
      toast.error('New memory content cannot be empty.');
      return;
    }
    try {
      await createMemoryFromSettings(newMemoryContent, userId, agentId);
      toast.success('Memory created successfully.');
      setNewMemoryContent('');
      loadMemories();
    } catch (err: any) {
      console.error('Failed to create memory:', err);
      toast.error(err.message || 'Failed to create memory.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4 border-b border-border/5 pb-8">
        <Input
          placeholder="Inject new recollection..."
          value={newMemoryContent}
          onChange={(e) => setNewMemoryContent(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
          className="flex-1 bg-transparent border-none focus-visible:ring-0 text-lg placeholder:text-foreground/10 p-0"
        />
        <Button onClick={handleCreate} variant="ghost" className="h-10 w-10 p-0 hover:bg-muted text-foreground/40 hover:text-primary">
          <PlusCircle className="h-5 w-5 stroke-[1]" />
        </Button>
      </div>

      {memories.length === 0 ? (
        <p className="text-xs text-muted-foreground/40 italic uppercase tracking-widest text-center py-20">No data points in current substrate.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr,120px,180px,100px] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/30 border-b border-border/5">
            <div>Content</div>
            <div>Source</div>
            <div>Timestamp</div>
            <div className="text-right">Action</div>
          </div>
          <div className="space-y-1">
            {memories.map((memory) => (
              <div key={memory.id} className="grid grid-cols-[1fr,120px,180px,100px] items-center px-4 py-4 rounded-lg hover:bg-muted/30 transition-colors group">
                <div className="text-sm text-foreground/80 leading-relaxed pr-8">
                  {editingMemoryId === memory.id ? (
                    <Input
                      autoFocus
                      value={editingMemoryContent}
                      onChange={(e) => setEditingMemoryContent(e.target.value)}
                      onBlur={() => handleUpdate(memory.id)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleUpdate(memory.id);
                      }}
                      className="bg-transparent border-none p-0 focus-visible:ring-0 h-auto text-sm"
                    />
                  ) : (
                    memory.content
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground/50 font-mono lower-case">
                  {memory.source}
                </div>
                <div className="text-[11px] text-muted-foreground/50 font-mono">
                  {new Date(memory.createdAt).toLocaleDateString()}
                </div>
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingMemoryId === memory.id ? (
                    <Button size="sm" variant="ghost" onClick={() => handleUpdate(memory.id)} className="h-7 px-2 text-[10px] uppercase font-bold text-primary">Save</Button>
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingMemoryId(memory.id);
                          setEditingMemoryContent(memory.content);
                        }}
                        className="h-7 w-7 text-muted-foreground/40 hover:text-foreground"
                      >
                        <Edit className="h-3.5 w-3.5 stroke-[1]" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(memory.id)} className="h-7 w-7 text-muted-foreground/20 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5 stroke-[1]" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
