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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <div className="font-mono text-xs uppercase tracking-wider h-4 overflow-hidden flex-1">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={displayedLog}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30, duration: 0.1 }}
            >
              {displayedLog || 'Processing...'}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          {stepNumber && totalSteps && (
            <span>Step {stepNumber}{totalSteps > stepNumber ? ` of ${totalSteps}` : ''}</span>
          )}
          {elapsedSeconds > 0 && (
            <span>({formatElapsedTime(elapsedSeconds)})</span>
          )}
        </div>
      </div>

      {logs.length > 1 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-white/60 hover:text-white/80 w-full justify-start"
            >
              {isOpen ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show details ({logs.length} steps)
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1">
            <div className="space-y-1 max-h-40 overflow-y-auto text-xs font-mono bg-white/5 rounded p-2 border border-white/10">
              {logs.map((log, index) => (
                <div key={index} className="text-white/70 py-1 border-b border-white/5 last:border-0">
                  <span className="text-white/40 mr-2">[{index + 1}]</span>
                  {log}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
