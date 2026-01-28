'use client';

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useArtifactStore } from '@/store/artifacts';
import { Artifact } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Check, Copy, Loader2, X, Download, FileCode, FileText as FileTextIcon, Calendar, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { formatFullDateTime, toDate } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArtifactViewerProps {
  artifactId: string;
}

export function ArtifactViewer({ artifactId }: ArtifactViewerProps) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCopied, setHasCopied] = useState(false);
  const firestore = useFirestore();
  const setActiveArtifact = useArtifactStore(state => state.setActiveArtifact);

  useEffect(() => {
    if (!firestore) return;
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

  const [metadataOpen, setMetadataOpen] = useState(false);

  const handleCopy = () => {
    if (artifact?.content) {
      navigator.clipboard.writeText(artifact.content);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!artifact?.content) return;
    const extension = artifact.type === 'code' ? 'js' : 'md';
    const filename = `${artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`;
    const blob = new Blob([artifact.content], { type: artifact.type === 'code' ? 'text/javascript' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    <div className="flex h-full flex-col bg-card border-l border-border">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 bg-background">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h3 className="font-semibold truncate text-foreground">{artifact.title}</h3>
          <Badge variant="outline" className="shrink-0">
            {artifact.type === 'code' ? (
              <>
                <FileCode className="h-3 w-3 mr-1" />
                Code
              </>
            ) : (
              <>
                <FileTextIcon className="h-3 w-3 mr-1" />
                Markdown
              </>
            )}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={handleDownload} className="hover:bg-accent" title="Download">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleCopy} className="hover:bg-accent" title="Copy to clipboard">
            {hasCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setActiveArtifact(null)} className="hover:bg-destructive/10" title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>
      {(artifact.createdAt || artifact.userId) && (
        <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen} className="border-b border-border">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-auto py-2 px-4 text-xs text-muted-foreground hover:text-foreground">
              <span>Metadata</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", metadataOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-3 space-y-2 text-xs text-muted-foreground">
            {artifact.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Created: {formatFullDateTime(artifact.createdAt)}</span>
              </div>
            )}
            {artifact.userId && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>User ID: {artifact.userId.substring(0, 8)}...</span>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
      <ScrollArea className="flex-1 overscroll-contain">
        <div className="p-3 sm:p-4 bg-background">
          {artifact.type === 'code' ? (
            <SyntaxHighlighter language="javascript" style={vscDarkPlus} customStyle={{ background: 'transparent', margin: 0, padding: 0 }} codeTagProps={{ style: { fontFamily: "var(--font-code)" } }}>
              {artifact.content}
            </SyntaxHighlighter>
          ) : (
            <article className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifact.content}</ReactMarkdown>
            </article>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
