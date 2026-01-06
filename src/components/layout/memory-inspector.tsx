'use client';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore } from '@/firebase';
import type { Memory } from '@/lib/types';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { BrainCircuit, Loader2, Search, Trash2, Edit, X, Save, Plus } from 'lucide-react';
import React, { useEffect, useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { deleteMemoryFromMemories, updateMemoryInMemories, createMemoryFromSettings } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface MemoryInspectorProps {
  userId: string;
}

export function MemoryInspector({ userId }: MemoryInspectorProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();

  // Fetch memories from memories collection (real-time listener)
  useEffect(() => {
    if (!userId) return;

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
            createdAt: data.createdAt?.toDate(),
          } as Memory;
        });
        setMemories(memoryList);
        setIsLoading(false);
      },
      err => {
        console.error('Error fetching memories:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, firestore]);

  // Apply search and date filters
  useEffect(() => {
    let filtered = [...memories];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.content.toLowerCase().includes(queryLower)
      );
    }
    
    // Apply date filter
    if (dateFilter === 'last7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(m => {
        const memDate = toDate(m.createdAt);
        return memDate >= sevenDaysAgo;
      });
    } else if (dateFilter === 'last30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(m => {
        const memDate = toDate(m.createdAt);
        return memDate >= thirtyDaysAgo;
      });
    }
    
    setFilteredMemories(filtered);
  }, [memories, dateFilter, searchQuery]);

  const handleDelete = (memoryId: string) => {
    startTransition(async () => {
      const result = await deleteMemoryFromMemories(memoryId, userId);
      if (result.success) {
        setMemories(prev => prev.filter(m => m.id !== memoryId));
        setDeleteDialogOpen(null);
        toast({ title: 'Memory deleted' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const handleUpdate = (memoryId: string) => {
    if (!editText.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Memory content cannot be empty.' });
      return;
    }
    startTransition(async () => {
      const result = await updateMemoryInMemories(memoryId, editText, userId);
      if (result.success) {
        setMemories(prev => prev.map(m => m.id === memoryId ? { ...m, content: editText } : m));
        setEditingId(null);
        setEditText('');
        toast({ title: 'Memory updated' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const startEditing = (memory: Memory) => {
    setEditingId(memory.id);
    setEditText(memory.content);
  };

  const handleCreate = () => {
    if (!newMemoryText.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Memory content cannot be empty.' });
      return;
    }
    startTransition(async () => {
      const result = await createMemoryFromSettings(newMemoryText.trim(), userId);
      if (result.success) {
        setCreateDialogOpen(false);
        setNewMemoryText('');
        toast({ title: 'Memory created' });
        // Memory will be added via real-time listener
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const displayMemories = filteredMemories.length > 0 ? filteredMemories : memories;

  return (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-cyan-400/20 space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold mb-1 neon-text-cyan">
                        Memory Inspector
                    </h3>
                    <p className="text-xs text-white/60">
                        Live view of Pandora's long-term memory. These memories help the AI remember your preferences and context across conversations.
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreateDialogOpen(true)}
                    className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-400"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                </Button>
            </div>
            
            {/* Search bar */}
            <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                    placeholder="Search memories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-black/40 border-white/10 text-white placeholder:text-white/40"
                />
            </div>
            
            {/* Date filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="bg-black/40 border-white/10 text-white">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="last7days">Last 7 days</SelectItem>
                    <SelectItem value="last30days">Last 30 days</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <ScrollArea className="flex-1">
            {isLoading ? (
            <div className="flex items-center justify-center h-full p-8">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
            ) : displayMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="glass-panel rounded-lg border border-cyan-400/20 p-6 max-w-sm">
                    <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-cyan-400/60 animate-pulse-slow" strokeWidth={1.5} />
                    <p className="font-semibold text-sm neon-text-cyan mb-2">Memory is empty</p>
                    <p className="text-xs text-white/60 leading-relaxed">
                        Start chatting with Pandora to build its memory. The AI will automatically remember important information about you, your preferences, and your conversations.
                    </p>
                </div>
            </div>
            ) : (
            <div className="flex flex-col gap-2 p-4">
                {displayMemories.map(memory => (
                <div 
                    key={memory.id} 
                    className="glass-panel rounded-lg border border-purple-400/20 p-3 hover:border-purple-400/30 hover:shadow-neon-purple-sm transition-all group gradient-border"
                >
                    {editingId === memory.id ? (
                        <div className="space-y-2">
                            <Textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="min-h-[100px] bg-black/40 border-white/10 text-white"
                            />
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUpdate(memory.id)}
                                    disabled={isPending}
                                >
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setEditingId(null);
                                        setEditText('');
                                    }}
                                    disabled={isPending}
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="mb-2 leading-relaxed text-sm text-white/90">{memory.content}</p>
                            <div className="flex items-center justify-between">
                                <p className="text-white/40 text-[10px]">
                                    {memory.createdAt ? formatDistanceToNow(toDate(memory.createdAt), { addSuffix: true }) : 'just now'}
                                </p>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-white/60 hover:text-white"
                                        onClick={() => startEditing(memory)}
                                    >
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-400/60 hover:text-red-400"
                                        onClick={() => setDeleteDialogOpen(memory.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                ))}
            </div>
            )}
        </ScrollArea>
        
        {/* Create memory dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="glass-panel-strong border border-cyan-400/20">
                <DialogHeader>
                    <DialogTitle>Create Memory</DialogTitle>
                    <DialogDescription>
                        Add a new memory to Pandora's long-term memory. This will help the AI remember important information.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        value={newMemoryText}
                        onChange={(e) => setNewMemoryText(e.target.value)}
                        placeholder="Enter memory content..."
                        className="min-h-[120px] bg-black/40 border-white/10 text-white placeholder:text-white/40"
                    />
                </div>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setCreateDialogOpen(false);
                            setNewMemoryText('');
                        }}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={isPending || !newMemoryText.trim()}
                        className="bg-cyan-600 hover:bg-cyan-700"
                    >
                        {isPending ? 'Creating...' : 'Create Memory'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteDialogOpen} onOpenChange={(open) => !open && setDeleteDialogOpen(null)}>
            <AlertDialogContent className="glass-panel-strong border border-red-400/20">
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Memory</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this memory? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => deleteDialogOpen && handleDelete(deleteDialogOpen)}
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
