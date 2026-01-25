'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function SystemStatus() {
  const [isOnline, setIsOnline] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // We use the agents endpoint as a health check for the backend
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'}/api/agents`);
        if (res.ok) {
            setIsOnline(true);
        } else {
            setIsOnline(false);
        }
      } catch (e) {
        setIsOnline(false);
      }
      setLastChecked(new Date());
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
      <div className={cn("h-2 w-2 rounded-full", isOnline ? "bg-green-500" : "bg-red-500")} />
      <span>{isOnline ? "System Online" : "System Offline"}</span>
      {/* <span className="text-[10px] opacity-50 ml-auto">{lastChecked?.toLocaleTimeString()}</span> */}
    </div>
  );
}

