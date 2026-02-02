'use client';

import { useArtifactStore } from '@/store/artifacts';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Copy, Check, Code, FileText } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function ArtifactPanel() {
  const { activeArtifact, isOpen, setIsOpen } = useArtifactStore();
  const [copied, setCopied] = useState(false);

  if (!activeArtifact) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="w-full md:w-[500px] lg:w-[600px] xl:w-[800px] bg-background border-l shadow-2xl z-50 flex flex-col h-full"
        >
          <header className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              {activeArtifact.type === 'code' ? (
                <Code className="h-5 w-5 text-primary" />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
              <h2 className="font-headline text-lg font-semibold truncate max-w-[200px] md:max-w-md">
                {activeArtifact.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copy</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 bg-muted/20">
            <div className="rounded-lg border bg-background shadow-sm overflow-hidden h-full flex flex-col">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
                <span className="text-xs text-muted-foreground font-mono">
                  {activeArtifact.type === 'code' ? 'Source Code' : 'Document Content'}
                </span>
              </div>
              <div className="flex-1 p-6 overflow-auto font-mono text-sm">
                <pre className={cn("whitespace-pre-wrap", activeArtifact.type === 'markdown' ? 'prose dark:prose-invert max-w-none font-sans' : '')}>
                  <code>{activeArtifact.content}</code>
                </pre>
              </div>
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

