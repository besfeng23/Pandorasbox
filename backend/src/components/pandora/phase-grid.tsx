
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const phases = [
    { id: 1, name: 'Foundation', status: 'active', progress: 100 },
    { id: 2, name: 'Memory', status: 'active', progress: 100 },
    { id: 3, name: 'Context', status: 'active', progress: 95 },
    { id: 4, name: 'Tools', status: 'active', progress: 100 },
    { id: 5, name: 'Agents', status: 'active', progress: 100 },
    { id: 6, name: 'Self-Maintenance', status: 'active', progress: 90 },
    { id: 7, name: 'Self-Healing', status: 'inactive', progress: 0 },
    { id: 8, name: 'Knowledge', status: 'active', progress: 100 },
    { id: 9, name: 'Federation', status: 'inactive', progress: 0 },
    { id: 10, name: 'Orchestration', status: 'partial', progress: 50 },
    { id: 11, name: 'Governance', status: 'inactive', progress: 0 },
    { id: 12, name: 'Reflection', status: 'active', progress: 90 },
    { id: 13, name: 'Cognition', status: 'inactive', progress: 0 },
    { id: 14, name: 'Subnetworks', status: 'inactive', progress: 0 },
];

export function PhaseGrid() {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            {phases.map((phase) => (
                <motion.div
                    key={phase.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: phase.id * 0.05 }}
                    className={cn(
                        "relative p-4 rounded-xl border backdrop-blur-md overflow-hidden group hover:scale-[1.02] transition-all duration-300",
                        phase.status === 'active'
                            ? "bg-primary/5 border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                            : phase.status === 'partial'
                                ? "bg-yellow-500/5 border-yellow-500/30"
                                : "bg-muted/10 border-white/5 opacity-50"
                    )}
                >
                    {/* Background Gradient */}
                    <div className={cn(
                        "absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity",
                        phase.status === 'active' ? "bg-gradient-to-br from-primary to-transparent"
                            : phase.status === 'partial' ? "bg-gradient-to-br from-yellow-500 to-transparent"
                                : "bg-transparent"
                    )} />

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <span className={cn(
                                "text-xs font-mono font-bold px-1.5 py-0.5 rounded border",
                                phase.status === 'active' ? "text-primary border-primary/30 bg-primary/10"
                                    : phase.status === 'partial' ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/10"
                                        : "text-muted-foreground border-white/10"
                            )}>
                                PHASE {phase.id.toString().padStart(2, '0')}
                            </span>
                            {phase.status === 'active' && (
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                            )}
                        </div>

                        <div>
                            <h3 className={cn(
                                "text-sm font-semibold tracking-wide uppercase mb-1",
                                phase.status === 'active' ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {phase.name}
                            </h3>

                            <div className="w-full bg-muted/20 h-1.5 rounded-full overflow-hidden mt-2">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${phase.progress}%` }}
                                    transition={{ duration: 1, delay: 0.5 + (phase.id * 0.1) }}
                                    className={cn(
                                        "h-full rounded-full",
                                        phase.status === 'active' ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                            : phase.status === 'partial' ? "bg-yellow-500"
                                                : "bg-muted-foreground/30"
                                    )}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] uppercase tracking-wider mt-1 text-muted-foreground font-mono">
                                <span>{phase.status}</span>
                                <span>{phase.progress}%</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
