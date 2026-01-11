'use client';

import { useFirestore } from '@/firebase';
import type { Artifact } from '@/lib/types';
import { useArtifactStore } from '@/store/artifacts';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { FileCode, Loader2 } from 'lucide-react';
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
        <div className="p-4 border-b border-border bg-card/30">
            <h3 className="text-sm font-semibold mb-1 text-foreground">
                Artifacts
            </h3>
            <p className="text-xs text-muted-foreground">
                Code snippets and documents created by Pandora during conversations.
            </p>
        </div>
        <ScrollArea className="flex-1">
            {isLoading ? (
            <div className="flex items-center justify-center h-full p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            ) : artifacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="rounded-xl border border-border bg-card/30 p-6 max-w-sm">
                    <FileCode className="h-10 w-10 mx-auto mb-4 text-muted-foreground" strokeWidth={1.5} />
                    <p className="font-semibold text-sm text-foreground mb-2">No artifacts yet</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Ask Pandora to create code snippets, documents, or other artifacts. They will appear here for easy access.
                    </p>
                </div>
            </div>
            ) : (
            <div className="flex flex-col gap-2 p-4">
                {artifacts.map(artifact => (
                <button 
                    key={artifact.id} 
                    className="w-full text-left p-3 rounded-lg border border-border bg-card/30 hover:bg-card/40 transition-colors group"
                    onClick={() => setActiveArtifactId(artifact.id)}
                >
                    <p className="font-medium text-sm truncate text-foreground">{artifact.title}</p>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-muted-foreground">
                            {artifact.createdAt ? formatDistanceToNow(
                                artifact.createdAt instanceof Date 
                                    ? artifact.createdAt 
                                    : (artifact.createdAt as any)?.toDate?.() || new Date((artifact.createdAt as any).seconds ? (artifact.createdAt as any).seconds * 1000 : artifact.createdAt as any), 
                                { addSuffix: true }
                            ) : 'just now'}
                        </p>
                        <Badge variant="outline" className="text-xs font-mono">{artifact.type}</Badge>
                    </div>
                </button>
                ))}
            </div>
            )}
        </ScrollArea>
    </div>
  );
}
