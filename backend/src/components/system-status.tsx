'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Database, BrainCircuit } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

type ServiceStatus = 'online' | 'offline' | 'checking';

export function SystemStatus() {
  const [inferenceStatus, setInferenceStatus] = useState<ServiceStatus>('checking');
  const [memoryStatus, setMemoryStatus] = useState<ServiceStatus>('checking');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

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
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const Dot = ({ status, label, icon: Icon }: { status: ServiceStatus; label: string; icon: any }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex cursor-help items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              status === 'checking' && 'animate-pulse bg-amber-500',
              status === 'online' && 'bg-emerald-500',
              status === 'offline' && 'bg-destructive'
            )}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent className="text-xs">
        {label}: {status === 'checking' ? 'Checking' : status === 'online' ? 'Online' : 'Offline'}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <div className="flex w-full items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
        <div className="flex items-center gap-3">
          <Dot status={inferenceStatus} label="Inference" icon={BrainCircuit} />
          <Dot status={memoryStatus} label="Memory" icon={Database} />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">System</span>
      </div>
    </TooltipProvider>
  );
}
