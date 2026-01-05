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
    <div className="flex flex-col h-full p-2 gap-2">
        <div className="p-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider neon-text-cyan">
                Memory Inspector
            </h3>
            <p className="text-xs text-white/60">
                Live view of AI's long-term memory.
            </p>
        </div>
        <div className="flex-1 min-h-0 rounded-lg glass-panel-strong border-glow-cyan p-2">
            <ScrollArea className="h-full">
                {isLoading ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin neon-text-cyan" />
                </div>
                ) : memories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-white/60 p-4">
                    <BrainCircuit className="h-8 w-8 mb-2 neon-text-cyan" strokeWidth={1.5} />
                    <p className="font-medium">Memory is empty</p>
                    <p className="text-xs">Chat with Pandora to build its memory.</p>
                </div>
                ) : (
                <div className="flex flex-col gap-3 p-2">
                    {memories.map(memory => (
                    <div key={memory.id} className="p-3 rounded-md glass-panel border border-white/10 font-code text-xs text-white/80 hover:border-glow-cyan transition-colors">
                        <p className="mb-2 leading-relaxed">{memory.content}</p>
                        <p className="text-white/40 text-[10px]">
                        {memory.timestamp ? formatDistanceToNow(memory.timestamp, { addSuffix: true }) : 'just now'}
                        </p>
                    </div>
                    ))}
                </div>
                )}
            </ScrollArea>
        </div>
    </div>
  );
}
