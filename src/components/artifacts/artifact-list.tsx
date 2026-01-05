'use client';

import { useFirestore } from '@/firebase';
import type { Artifact } from '@/lib/types';
import { useArtifactStore } from '@/store/artifacts';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { FileCode, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface ArtifactListProps {
  userId: string;
}

export function ArtifactList({ userId }: ArtifactListProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const setActiveArtifactId = useArtifactStore(state => state.setActiveArtifactId);
  const firestore = useFirestore();

  useEffect(() => {
    if (!userId) return;

    const artifactsCollection = collection(firestore, 'artifacts');
    const q = query(
        artifactsCollection, 
        where('userId', '==', userId), 
        orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const artifactList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
          } as Artifact;
        });
        setArtifacts(artifactList);
        setIsLoading(false);
      },
      err => {
        console.error('Error fetching artifacts:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, firestore]);

  return (
    <div className="flex flex-col h-full p-2 gap-2">
        <div className="flex-1 min-h-0 rounded-lg glass-panel-strong border-glow-cyan p-2">
            {isLoading ? (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin neon-text-cyan" />
            </div>
            ) : artifacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-white/60 p-4">
                <FileCode className="h-8 w-8 mb-2 neon-text-cyan" strokeWidth={1.5} />
                <p className="font-medium">No artifacts yet</p>
                <p className="text-xs">Ask Pandora to create a code snippet or document.</p>
            </div>
            ) : (
            <div className="flex flex-col gap-2 p-2">
                {artifacts.map(artifact => (
                <button 
                    key={artifact.id} 
                    className="w-full text-left p-3 rounded-md glass-panel border border-white/10 hover:border-glow-purple hover:glass-panel-strong transition-all"
                    onClick={() => setActiveArtifactId(artifact.id)}
                >
                    <p className="font-medium text-sm truncate text-white/90">{artifact.title}</p>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-white/40">
                            {artifact.createdAt ? formatDistanceToNow(artifact.createdAt, { addSuffix: true }) : 'just now'}
                        </p>
                        <p className="text-xs font-mono bg-neon-cyan/20 text-neon-cyan px-1.5 py-0.5 rounded-sm border border-neon-cyan/30">{artifact.type}</p>
                    </div>
                </button>
                ))}
            </div>
            )}
        </div>
    </div>
  );
}
