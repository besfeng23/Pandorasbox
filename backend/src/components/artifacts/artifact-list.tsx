'use client';

import { useFirestore } from '@/firebase';
import type { Artifact } from '@/lib/types';
import { useArtifactStore } from '@/store/artifacts';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { FileCode, Loader2, FileText } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-cyan-400/20">
            <h3 className="text-sm font-semibold mb-1 neon-text-purple">
                Artifacts
            </h3>
            <p className="text-xs text-white/60">
                Code snippets and documents created by Pandora during conversations.
            </p>
        </div>
        <ScrollArea className="flex-1">
            {isLoading ? (
            <div className="flex items-center justify-center h-full p-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
            ) : artifacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="glass-panel rounded-lg border border-purple-400/20 p-6 max-w-sm">
                    <FileCode className="h-12 w-12 mx-auto mb-4 text-purple-400/60 animate-pulse-slow" strokeWidth={1.5} />
                    <p className="font-semibold text-sm neon-text-purple mb-2">No artifacts yet</p>
                    <p className="text-xs text-white/60 leading-relaxed">
                        Ask Pandora to create code snippets, documents, or other artifacts. They will appear here for easy access.
                    </p>
                </div>
            </div>
            ) : (
            <div className="flex flex-col gap-2 p-4">
                {artifacts.map(artifact => (
                <button 
                    key={artifact.id} 
                    className="w-full text-left p-3 rounded-lg glass-panel border border-purple-400/20 hover:border-purple-400/30 hover:shadow-neon-purple-sm transition-all group"
                    onClick={() => setActiveArtifactId(artifact.id)}
                >
                    <p className="font-medium text-sm truncate text-white/90 group-hover:text-purple-400/80 transition-colors">{artifact.title}</p>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-white/40">
                            {artifact.createdAt ? formatDistanceToNow(artifact.createdAt instanceof Date ? artifact.createdAt : (artifact.createdAt as any)?.toDate?.() || new Date(artifact.createdAt as any), { addSuffix: true }) : 'just now'}
                        </p>
                        <Badge variant="secondary" className="text-xs font-mono bg-purple-400/20 text-purple-400 border-purple-400/30">{artifact.type}</Badge>
                    </div>
                </button>
                ))}
            </div>
            )}
        </ScrollArea>
    </div>
  );
}
