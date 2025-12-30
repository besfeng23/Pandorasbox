'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ThinkingIndicatorProps {
  logs: string[];
}

export function ThinkingIndicator({ logs }: ThinkingIndicatorProps) {
  const [displayedLog, setDisplayedLog] = useState(logs[logs.length - 1] || '');

  useEffect(() => {
    setDisplayedLog(logs[logs.length - 1] || '');
  }, [logs]);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <div className="font-mono text-xs uppercase tracking-wider h-4 overflow-hidden">
            <AnimatePresence mode="popLayout">
                <motion.div
                    key={displayedLog}
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30, duration: 0.1 }}
                >
                    {displayedLog}
                </motion.div>
            </AnimatePresence>
        </div>
    </div>
  );
}
