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
  
  // Use relative paths if the API_URL is pointing to the old backend
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const isOldBackend = rawApiUrl.includes('pandora-backend-536979070288');
  const API_URL = isOldBackend ? '' : rawApiUrl;

  const checkHealth = async () => {
    try {
        const infRes = await fetch(`${API_URL}/api/health/inference`);
        setInferenceStatus(infRes.ok ? 'online' : 'offline');
    } catch {
        setInferenceStatus('offline');
    }

    try {
        const memRes = await fetch(`${API_URL}/api/health/memory`);
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
    <TooltipProvider>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/20 border border-white/5 w-full">
            <div className="flex items-center gap-3">
                <StatusDot status={inferenceStatus} label="vLLM (Brain)" icon={BrainCircuit} />
                <StatusDot status={memoryStatus} label="Qdrant (Memory)" icon={Database} />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/30 font-mono">
                System
            </div>
        </div>
    </TooltipProvider>
  );
}
