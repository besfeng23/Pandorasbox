'use client';

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useArtifactStore } from '@/store/artifacts';
import { Artifact } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Check, Copy, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '../ui/scroll-area';

interface ArtifactViewerProps {
  artifactId: string;
}

export function ArtifactViewer({ artifactId }: ArtifactViewerProps) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCopied, setHasCopied] = useState(false);
  const firestore = useFirestore();
  const setActiveArtifactId = useArtifactStore(state => state.setActiveArtifactId);

  useEffect(() => {
    setIsLoading(true);
    const unsub = onSnapshot(doc(firestore, 'artifacts', artifactId), (doc) => {
      if (doc.exists()) {
        setArtifact({ id: doc.id, ...doc.data() } as Artifact);
      } else {
        setArtifact(null);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [artifactId, firestore]);

  const handleCopy = () => {
    if (artifact?.content) {
      navigator.clipboard.writeText(artifact.content);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!artifact) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        Artifact not found.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col glass-panel-strong border-l border-white/10 bg-void">
      <header className="flex h-14 items-center justify-between border-b border-white/10 px-4 glass-panel">
        <h3 className="font-semibold truncate pr-4 neon-text-cyan">{artifact.title}</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleCopy} className="hover:bg-neon-cyan/10 text-white/70 hover:text-neon-cyan">
            {hasCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setActiveArtifactId(null)} className="hover:bg-red-500/10 text-white/70 hover:text-red-400">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <ScrollArea className="flex-1">
        <div className="p-4 bg-void">
            {artifact.type === 'code' ? (
                <SyntaxHighlighter language="javascript" style={vscDarkPlus} customStyle={{ background: 'transparent', margin: 0, padding: 0 }} codeTagProps={{style: {fontFamily: "var(--font-code)"}}}>
                    {artifact.content}
                </SyntaxHighlighter>
            ) : (
                <article className="prose prose-zinc dark:prose-invert max-w-none prose-headings:text-white prose-p:text-white/80 prose-strong:text-white prose-code:text-neon-cyan">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifact.content}</ReactMarkdown>
                </article>
            )}
        </div>
      </ScrollArea>
    </div>
  );
}
