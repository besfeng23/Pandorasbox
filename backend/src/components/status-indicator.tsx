'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Activity, Database, BrainCircuit, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface StatusIndicatorProps {
    userId: string;
}

type ServiceStatus = 'online' | 'offline' | 'checking';

export function StatusIndicator({ userId }: StatusIndicatorProps) {
    const [inferenceStatus, setInferenceStatus] = useState<ServiceStatus>('checking');
    const [memoryStatus, setMemoryStatus] = useState<ServiceStatus>('checking');

    const checkHealth = async () => {
        try {
            const infRes = await fetch('/api/health/inference');
            setInferenceStatus(infRes.ok ? 'online' : 'offline');
        } catch {
            setInferenceStatus('offline');
        }

        try {
            const memRes = await fetch('/api/health/memory');
            setMemoryStatus(memRes.ok ? 'online' : 'offline');
        } catch {
            setMemoryStatus('offline');
        }
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    const StatusDot = ({ status, label, icon: Icon }: { status: ServiceStatus, label: string, icon: any }) => (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                    <Icon className={cn("h-3 w-3", status === 'online' ? "text-emerald-400" : "text-red-400")} />
                    <motion.div 
                        className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-red-500",
                            status === 'checking' && "bg-yellow-500 animate-pulse"
                        )}
                        animate={{ opacity: status === 'online' ? [0.5, 1, 0.5] : 1 }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </div>
            </TooltipTrigger>
            <TooltipContent className="glass-panel-strong border border-white/10 text-xs">
                <p>{label}: {status === 'checking' ? 'Checking...' : (status === 'online' ? 'Online' : 'Offline')}</p>
            </TooltipContent>
        </Tooltip>
    );

    return (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/20 border border-white/5 w-full">
            <div className="flex items-center gap-3">
                <StatusDot status={inferenceStatus} label="vLLM (Brain)" icon={BrainCircuit} />
                <StatusDot status={memoryStatus} label="Qdrant (Memory)" icon={Database} />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/30 font-mono">
                System
            </div>
        </div>
    )
}
