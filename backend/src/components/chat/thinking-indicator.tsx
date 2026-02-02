'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Button } from '../ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn, toDate } from '@/lib/utils';

interface ThinkingIndicatorProps {
  logs: string[];
  createdAt?: any; // Timestamp for elapsed time calculation
}

export function ThinkingIndicator({ logs, createdAt }: ThinkingIndicatorProps) {
  const [displayedLog, setDisplayedLog] = useState(logs[logs.length - 1] || '');
  const [isOpen, setIsOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setDisplayedLog(logs[logs.length - 1] || '');
  }, [logs]);

  // Calculate elapsed time
  useEffect(() => {
    if (!createdAt) return;

    const startTime = toDate(createdAt);
    const updateElapsed = () => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  // Extract step number from logs
  const stepMatch = logs[logs.length - 1]?.match(/step\s+(\d+)/i) || logs[logs.length - 1]?.match(/(\d+)\s+of/i);
  const stepNumber = stepMatch ? parseInt(stepMatch[1]) : null;
  const totalSteps = logs.length > 0 ? logs.length : null;

  const formatElapsedTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="flex flex-col gap-3 py-4 max-w-xl">
      <div className="flex items-center gap-3">
        <div className="flex gap-1 h-3 items-center">
          <motion.div
            className="w-1 h-1 bg-primary/40 rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 mb-1 flex items-center gap-2">
            Intelligence Sequence
            {elapsedSeconds > 0 && <span className="font-mono text-[9px] lowercase tracking-tighter opacity-50">({formatElapsedTime(elapsedSeconds)})</span>}
          </div>
          <div className="h-4 overflow-hidden relative">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={displayedLog}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] text-foreground/60 font-medium truncate italic"
              >
                {displayedLog || 'Synthesizing...'}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {logs.length > 1 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-[10px] uppercase font-bold tracking-widest text-foreground/20 hover:text-foreground/40 hover:bg-transparent"
            >
              {isOpen ? 'Close Register' : `Expand Track (${logs.length} operations)`}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-4 space-y-2 border-l border-border/5 pl-4 max-h-48 overflow-y-auto no-scrollbar">
              {logs.map((log, index) => (
                <div key={index} className="flex gap-4 group">
                  <span className="text-[9px] font-mono text-foreground/10 group-hover:text-foreground/30 transition-colors shrink-0">{(index + 1).toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-foreground/40 leading-relaxed font-mono">{log}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
