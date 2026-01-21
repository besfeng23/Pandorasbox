import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, PlusCircle, AlertCircle } from 'lucide-react';
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
      const fetchedMemories = await fetchMemories(userId, agentId, ''); // Fetch all memories
      setMemories(fetchedMemories);
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
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="Add a new memory..."
          value={newMemoryContent}
          onChange={(e) => setNewMemoryContent(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleCreate();
            }
          }}
        />
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create
        </Button>
      </div>

      {memories.length === 0 ? (
        <p className="text-muted-foreground">No memories found. Start by adding one above!</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead className="w-[150px]">Source</TableHead>
              <TableHead className="w-[180px]">Created At</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memories.map((memory) => (
              <TableRow key={memory.id}>
                <TableCell className="font-medium">
                  {editingMemoryId === memory.id ? (
                    <Input
                      value={editingMemoryContent}
                      onChange={(e) => setEditingMemoryContent(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdate(memory.id);
                        }
                      }}
                    />
                  ) : (
                    memory.content
                  )}
                </TableCell>
                <TableCell>{memory.source}</TableCell>
                <TableCell>{new Date(memory.createdAt).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {editingMemoryId === memory.id ? (
                    <div className="flex justify-end space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => handleUpdate(memory.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingMemoryId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingMemoryId(memory.id);
                          setEditingMemoryContent(memory.content);
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(memory.id)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

