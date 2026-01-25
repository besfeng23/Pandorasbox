'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Code, FileText, Maximize2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArtifactViewerProps {
  title: string;
  type: 'code' | 'markdown';
  content: string;
  language?: string;
}

export function ArtifactViewer({ title, type, content, language = 'plaintext' }: ArtifactViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <div className="my-2 rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden max-w-sm sm:max-w-md">
        <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2">
            {type === 'code' ? <Code className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
            <span className="text-sm font-medium truncate max-w-[150px]">{title}</span>
          </div>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Maximize2 className="mr-1 h-3 w-3" />
              Open
            </Button>
          </DialogTrigger>
        </div>
        <div className="bg-muted/30 p-3 max-h-[150px] overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/10 pointer-events-none" />
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words line-clamp-6">
            {content.slice(0, 300)}
            {content.length > 300 && '...'}
          </pre>
        </div>
      </div>

      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            {type === 'code' ? <Code className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            {type === 'code' ? 'Code Artifact' : 'Document Artifact'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-muted/30 p-4 md:p-6">
            <div className="relative rounded-md border bg-background shadow-sm">
                <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 sticky top-0 z-10">
                    <span className="text-xs text-muted-foreground font-mono">{language}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        <span className="sr-only">Copy</span>
                    </Button>
                </div>
                <div className="p-4 overflow-x-auto">
                    <pre className={cn("text-sm font-mono", type === 'markdown' ? 'whitespace-pre-wrap' : '')}>
                        <code>{content}</code>
                    </pre>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

