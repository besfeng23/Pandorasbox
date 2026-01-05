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
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold mb-1">
                Artifacts
            </h3>
            <p className="text-xs text-muted-foreground">
                Code snippets and documents created by Pandora.
            </p>
        </div>
        <ScrollArea className="flex-1">
            {isLoading ? (
            <div className="flex items-center justify-center h-full p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            ) : artifacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                <FileCode className="h-8 w-8 mb-2 text-muted-foreground" strokeWidth={1.5} />
                <p className="font-medium text-sm">No artifacts yet</p>
                <p className="text-xs">Ask Pandora to create a code snippet or document.</p>
            </div>
            ) : (
            <div className="flex flex-col gap-2 p-4">
                {artifacts.map(artifact => (
                <button 
                    key={artifact.id} 
                    className="w-full text-left p-3 rounded-lg bg-muted border border-border hover:bg-accent transition-colors"
                    onClick={() => setActiveArtifactId(artifact.id)}
                >
                    <p className="font-medium text-sm truncate text-foreground">{artifact.title}</p>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-muted-foreground">
                            {artifact.createdAt ? formatDistanceToNow(artifact.createdAt, { addSuffix: true }) : 'just now'}
                        </p>
                        <Badge variant="secondary" className="text-xs font-mono">{artifact.type}</Badge>
                    </div>
                </button>
                ))}
            </div>
            )}
        </ScrollArea>
    </div>
  );
}
