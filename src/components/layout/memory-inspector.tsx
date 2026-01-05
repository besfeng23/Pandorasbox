'use client';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore } from '@/firebase';
import type { Memory } from '@/lib/types';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
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

  return (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-cyan-400/20">
            <h3 className="text-sm font-semibold mb-1 neon-text-cyan">
                Memory Inspector
            </h3>
            <p className="text-xs text-white/60">
                Live view of Pandora's long-term memory. These memories help the AI remember your preferences and context across conversations.
            </p>
        </div>
        <ScrollArea className="flex-1">
            {isLoading ? (
            <div className="flex items-center justify-center h-full p-8">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
            ) : memories.length === 0 ? (
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
                {memories.map(memory => (
                <div 
                    key={memory.id} 
                    className="glass-panel rounded-lg border border-purple-400/20 p-3 hover:border-purple-400/30 hover:shadow-neon-purple-sm transition-all"
                >
                    <p className="mb-2 leading-relaxed text-sm text-white/90">{memory.content}</p>
                    <p className="text-white/40 text-[10px]">
                    {memory.createdAt ? formatDistanceToNow(memory.createdAt instanceof Date ? memory.createdAt : new Date(), { addSuffix: true }) : 'just now'}
                    </p>
                </div>
                ))}
            </div>
            )}
        </ScrollArea>
    </div>
  );
}
