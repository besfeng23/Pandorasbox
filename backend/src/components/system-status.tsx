'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Activity, Database, BrainCircuit } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

type ServiceStatus = 'online' | 'offline' | 'checking';

export function SystemStatus() {
    const [inferenceStatus, setInferenceStatus] = useState<ServiceStatus>('checking');
    const [memoryStatus, setMemoryStatus] = useState<ServiceStatus>('checking');
    const [inferenceError, setInferenceError] = useState<string>('');
    const [memoryError, setMemoryError] = useState<string>('');

    const checkHealth = async () => {
        try {
            const infRes = await fetch('/api/health/inference');
            if (infRes.ok) {
                setInferenceStatus('online');
                setInferenceError('');
            } else {
                setInferenceStatus('offline');
                const data = await infRes.json().catch(() => ({}));
                setInferenceError(data.error || 'Service Unavailable');
            }
        } catch (e) {
            setInferenceStatus('offline');
            setInferenceError('Network Error');
        }

        try {
            const memRes = await fetch('/api/health/memory');
            if (memRes.ok) {
                setMemoryStatus('online');
                setMemoryError('');
            } else {
                setMemoryStatus('offline');
                const data = await memRes.json().catch(() => ({}));
                setMemoryError(data.error || 'Service Unavailable');
            }
        } catch (e) {
            setMemoryStatus('offline');
            setMemoryError('Network Error');
        }
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    const StatusDot = ({ status, label, icon: Icon, error }: { status: ServiceStatus, label: string, icon: any, error?: string }) => (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help group">
                    <Icon className={cn("h-3.5 w-3.5 stroke-[1]", status === 'online' ? "text-foreground/40" : "text-red-400/60")} />
                    <div
                        className={cn(
                            "h-1 w-1 rounded-none",
                            status === 'online' ? "bg-primary/60" : "bg-red-400/40",
                            status === 'checking' && "bg-foreground/20 animate-pulse"
                        )}
                    />
                </div>
            </TooltipTrigger>
            <TooltipContent className="bg-background border border-border/10 text-[10px] uppercase tracking-[0.4em] font-bold p-2 rounded-none shadow-none">
                <p>{label}: {status === 'checking' ? 'Checking...' : (status === 'online' ? 'Online' : 'Offline')}</p>
                {status === 'offline' && error && (
                    <p className="text-red-400/80 mt-1 lowercase font-mono">{error}</p>
                )}
            </TooltipContent>
        </Tooltip>
    );

    return (
        <TooltipProvider>
            <div className="flex items-center gap-6 px-4 py-2 border-none bg-transparent w-full">
                <div className="flex items-center gap-4">
                    <StatusDot status={inferenceStatus} label="Substrate" icon={BrainCircuit} error={inferenceError} />
                    <StatusDot status={memoryStatus} label="Vault" icon={Database} error={memoryError} />
                </div>
                <div className="text-[10px] uppercase tracking-[0.4em] text-foreground/10 font-bold ml-auto">
                    Health
                </div>
            </div>
        </TooltipProvider>
    );
}
