'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Code, FileText, Maximize2, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useArtifactStore } from '@/store/artifacts';

import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Artifact } from '@/lib/types';

interface ArtifactViewerProps {
  artifactId?: string;
  title?: string;
  type?: 'code' | 'markdown' | 'html' | 'svg' | 'react';
  content?: string;
  language?: string;
}

export function ArtifactViewer({ artifactId, title: initialTitle, type: initialType, content: initialContent, language: initialLanguage = 'plaintext' }: ArtifactViewerProps) {
  const [artifact, setArtifact] = useState<Partial<Artifact> | null>(
    artifactId ? null : { title: initialTitle, type: initialType as any, content: initialContent, language: initialLanguage }
  );
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(!!artifactId);
  const { setActiveArtifact } = useArtifactStore();
  const firestore = useFirestore();

  useEffect(() => {
    if (!artifactId || !firestore) return;

    setIsLoading(true);
    const unsub = onSnapshot(doc(firestore, 'artifacts', artifactId), (doc) => {
      if (doc.exists()) {
        setArtifact({ id: doc.id, ...doc.data() } as Artifact);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [artifactId, firestore]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (artifact?.content) {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpen = () => {
    if (artifact) {
      setActiveArtifact({
        id: artifact.id || Math.random().toString(36).substring(7),
        title: artifact.title || 'Untitled',
        type: (artifact.type as any) || 'code',
        content: artifact.content || '',
        language: artifact.language || 'plaintext',
        createdAt: artifact.createdAt ? (artifact.createdAt as any).toDate() : new Date()
      });
    }
  };

  if (isLoading) {
    return (
      <div className="my-2 rounded-lg border bg-card/50 p-4 flex items-center gap-3 animate-pulse">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Retaining artifact...</span>
      </div>
    );
  }

  if (!artifact) return null;

  const { title, type, content } = artifact;

  return (
    <div
      className="my-2 rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden max-w-sm sm:max-w-md cursor-pointer hover:border-primary/50 transition-colors group/artifact"
      onClick={handleOpen}
    >
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          {type === 'code' ? <Code className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
          <span className="text-sm font-medium truncate max-w-[150px]">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
            <ExternalLink className="mr-1 h-3 w-3" />
            View
          </Button>
        </div>
      </div>
      {content && (
        <div className="bg-muted/30 p-3 max-h-[120px] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/10 pointer-events-none" />
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words line-clamp-4">
            {content.slice(0, 200)}
            {content.length > 200 && '...'}
          </pre>
        </div>
      )}
    </div>
  );
}

