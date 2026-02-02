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
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full md:w-[500px] lg:w-[600px] xl:w-[800px] bg-background border-l border-border/10 z-50 flex flex-col h-full overflow-hidden"
        >
          <header className="flex items-center justify-between px-8 py-6 h-16 shrink-0 z-10">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40">
                {activeArtifact.type === 'code' ? 'Code Artifact' : 'Document'}
              </span>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] truncate max-w-[200px] md:max-w-md text-foreground/80">
                {activeArtifact.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-foreground/[0.03]" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-primary stroke-[1]" /> : <Copy className="h-4 w-4 stroke-[1]" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-foreground/[0.03]" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4 stroke-[1]" />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-hidden flex flex-col pt-0">
            <div className="flex-1 overflow-auto px-8 pb-8 scroll-smooth no-scrollbar">
              <div className={cn(
                "w-full h-full",
                activeArtifact.type === 'markdown' ? 'prose prose-sm dark:prose-invert max-w-none font-sans leading-relaxed' : 'font-mono text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap'
              )}>
                {activeArtifact.type === 'markdown' ? (
                  <pre className="bg-transparent p-0 border-none shadow-none font-mono text-[13px]">
                    <code>{activeArtifact.content}</code>
                  </pre>
                ) : (
                  <code>{activeArtifact.content}</code>
                )}
              </div>
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

