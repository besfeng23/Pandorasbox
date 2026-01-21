
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { deleteMemoryFromMemories, updateMemoryInMemories } from '@/app/actions';
import type { Memory } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, Edit, Save, X, Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { toDate } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MemoryTableProps {
  userId: string;
}

export function MemoryTable({ userId }: MemoryTableProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();

  // Fetch memories from memories collection (real-time listener)
  useEffect(() => {
    if (!userId || !firestore) {
      console.log('[MemoryTable] Missing userId or firestore:', { userId: !!userId, firestore: !!firestore });
      return;
    }

    console.log('[MemoryTable] Setting up listener for userId:', userId);
    setIsLoading(true);
    const memoriesCollection = collection(firestore, 'memories');
    const q = query(
      memoriesCollection, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const memoryList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: toDate(data.createdAt),
          } as Memory;
        });
        console.log('[MemoryTable] Received', memoryList.length, 'memories for userId:', userId);
        setMemories(memoryList);
        setIsLoading(false);
      },
      err => {
        console.error('[MemoryTable] Error fetching memories:', err);
        setIsLoading(false);
        // Check if it's a missing index error
        if (err.code === 'failed-precondition' || err.message?.includes('index')) {
          toast({ 
            variant: 'destructive', 
            title: 'Index Required', 
            description: 'Firestore index missing. Check console for index creation link.' 
          });
          console.error('[MemoryTable] Firestore index required. Create index for: memories collection, fields: userId (Ascending), createdAt (Descending)');
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to load memories.' });
        }
      }
    );

    return () => unsubscribe();
  }, [userId, firestore, toast]);

  // Apply search filter
  useEffect(() => {
    let filtered = [...memories];
    
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.content.toLowerCase().includes(queryLower)
      );
    }
    
    setFilteredMemories(filtered);
  }, [memories, searchQuery]);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteMemoryFromMemories(id, userId);
      if (result.success) {
        setDeleteDialogOpen(null);
        toast({ title: 'Memory deleted' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const handleUpdate = (id: string) => {
    if (!editText.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Memory content cannot be empty.' });
        return;
    }
    startTransition(async () => {
      const result = await updateMemoryInMemories(id, editText, userId);
      if (result.success) {
        toast({ title: 'Memory updated' });
        setEditingId(null);
        setEditText('');
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const startEditing = (memory: Memory) => {
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
        const date = toDate(timestamp);
        return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
        return 'N/A';
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
                <TableHead className="w-[70%]">Content</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredMemories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No memories found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMemories.map((memory) => (
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
                          <p className="truncate-3-lines">{memory.content}</p>
                        </div>
                      )}
                    </TableCell>
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
                          <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(memory.id)} disabled={isPending}>
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
