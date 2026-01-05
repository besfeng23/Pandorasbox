'use client';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore } from '@/firebase';
import type { Memory } from '@/lib/types';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { BrainCircuit, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface MemoryInspectorProps {
  userId: string;
}

export function MemoryInspector({ userId }: MemoryInspectorProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    if (!userId) return;

    const memoriesCollection = collection(firestore, `users/${userId}/memories`);
    const q = query(memoriesCollection, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const memoryList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate(),
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

  return (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold mb-1">
                Memory Inspector
            </h3>
            <p className="text-xs text-muted-foreground">
                Live view of AI's long-term memory.
            </p>
        </div>
        <ScrollArea className="flex-1">
            {isLoading ? (
            <div className="flex items-center justify-center h-full p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            ) : memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                <BrainCircuit className="h-8 w-8 mb-2 text-muted-foreground" strokeWidth={1.5} />
                <p className="font-medium text-sm">Memory is empty</p>
                <p className="text-xs">Chat with Pandora to build its memory.</p>
            </div>
            ) : (
            <div className="flex flex-col gap-2 p-4">
                {memories.map(memory => (
                <div key={memory.id} className="p-3 rounded-lg bg-muted border border-border text-xs hover:bg-accent transition-colors">
                    <p className="mb-2 leading-relaxed text-foreground">{memory.content}</p>
                    <p className="text-muted-foreground text-[10px]">
                    {memory.timestamp ? formatDistanceToNow(memory.timestamp, { addSuffix: true }) : 'just now'}
                    </p>
                </div>
                ))}
            </div>
            )}
        </ScrollArea>
    </div>
  );
}
