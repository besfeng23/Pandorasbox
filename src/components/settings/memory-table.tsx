
'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { getMemories, deleteMemory, updateMemory } from '@/app/actions';
import { Message } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, Edit, Save, X, Search, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

interface MemoryTableProps {
  userId: string;
}

export function MemoryTable({ userId }: MemoryTableProps) {
  const [memories, setMemories] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isPending, startTransition] = useTransition();

  const debouncedSearch = useDebounce(searchQuery, 500);
  const { toast } = useToast();

  const fetchMemories = useCallback(async (query?: string) => {
    setIsLoading(true);
    try {
      const fetchedMemories = (await getMemories(userId, query)) as Message[];
      setMemories(fetchedMemories);
    } catch (error) {
      console.error('Failed to fetch memories', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch memories.' });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchMemories(debouncedSearch);
  }, [debouncedSearch, fetchMemories]);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      // Optimistic UI update
      setMemories(prev => prev.filter(m => m.id !== id));
      const result = await deleteMemory(id, userId);
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
        fetchMemories(debouncedSearch); // Re-fetch to revert optimistic update
      } else {
        toast({ title: 'Memory deleted' });
      }
    });
  };

  const handleUpdate = (id: string) => {
    if (!editText.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Memory content cannot be empty.' });
        return;
    }
    startTransition(async () => {
      const result = await updateMemory(id, editText, userId);
      if (result.success) {
        toast({ title: 'Memory updated' });
        setEditingId(null);
        fetchMemories(debouncedSearch);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const startEditing = (memory: Message) => {
    setEditingId(memory.id);
    setEditText(memory.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };
  
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
        return 'Invalid Date';
    }
  }


  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold tracking-tight">Memory Database</h3>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <div className="rounded-md border flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Content</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : memories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No memories found.
                  </TableCell>
                </TableRow>
              ) : (
                memories.map((memory) => (
                  <TableRow key={memory.id}>
                    <TableCell className="font-medium align-top">
                      {editingId === memory.id ? (
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[100px]"
                        />
                      ) : (
                        <div>
                          {memory.type === 'knowledge_chunk' && (
                            <div className='flex items-center gap-2 mb-2'>
                                <FileText className='h-4 w-4 text-muted-foreground'/>
                                <Badge variant="secondary" className='font-normal'>{memory.source_filename}</Badge>
                            </div>
                          )}
                          <p className="truncate-3-lines">{memory.content}</p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top capitalize">{memory.role}</TableCell>
                    <TableCell className="align-top">{formatTimestamp(memory.createdAt)}</TableCell>
                    <TableCell className="text-right align-top">
                      {editingId === memory.id ? (
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleUpdate(memory.id)} disabled={isPending}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={cancelEditing} disabled={isPending}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => startEditing(memory)} disabled={isPending}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDelete(memory.id)} disabled={isPending}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}

// Add this utility class to your globals.css or a utility stylesheet
// to truncate text after 3 lines.
const styles = `
  .truncate-3-lines {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

if (typeof window !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}
