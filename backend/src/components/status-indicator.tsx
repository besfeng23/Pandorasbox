'use client';

import React from 'react';
import { useConnectionStore } from '@/store/connection';
import { useChatHistory } from '@/hooks/use-chat-history';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StatusIndicatorProps {
    userId: string;
}

export function StatusIndicator({ userId }: StatusIndicatorProps) {
    // This triggers the connection listener
<<<<<<< HEAD:backend/src/components/status-indicator.tsx
    useChatHistory(userId, null);
    const { status, latency } = useConnectionStore();

    const statusConfig = {
        live: {
            text: 'Synced',
            color: 'bg-emerald-500',
            pulse: true,
        },
        syncing: {
            text: 'Saving...',
            color: 'bg-amber-500',
            pulse: false,
        },
        offline: {
            text: 'Offline',
            color: 'bg-zinc-500',
            pulse: false,
        }
    };

    const currentStatus = statusConfig[status];

    return (
        <div className="flex items-center justify-center p-2 rounded-lg transition-colors text-xs font-medium text-muted-foreground w-full">
            <motion.div 
                className={cn("h-2 w-2 rounded-full mr-2", currentStatus.color)}
                animate={{ scale: currentStatus.pulse ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span>{currentStatus.text}</span>
            {status === 'live' && latency !== null && (
                <span className="ml-1 text-muted-foreground/70">({latency}ms)</span>
            )}
        </div>
    )
}
