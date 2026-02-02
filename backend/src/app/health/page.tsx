'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { getSystemHealth } from '@/app/actions';
import {
    Activity,
    Database,
    BrainCircuit,
    ShieldCheck,
    ChevronRight,
    RefreshCw,
    Server,
    Cloud,
    Cpu,
    Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

interface HealthData {
    qdrant: { status: string; latency: number };
    inference: { status: string; latency: number };
    firebase: { status: string };
    timestamp: string;
}

export default function HealthPage() {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const data = await getSystemHealth();
            setHealth(data);

            const newPoint = {
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                inference: data.inference.latency,
                qdrant: data.qdrant.latency
            };

            setHistory(prev => [...prev.slice(-14), newPoint]);
        } catch (error) {
            console.error('Failed to fetch health:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 10000);
        return () => clearInterval(interval);
    }, []);

    const ServiceMetric = ({ name, status, latency, icon: Icon, description }: any) => (
        <div className="group relative p-8 bg-background border border-border/5 transition-all duration-500 hover:border-primary/20">
            <header className="flex items-center justify-between mb-8">
                <div className="h-10 w-10 border border-foreground/5 flex items-center justify-center bg-foreground/[0.02] group-hover:border-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-foreground/40 group-hover:text-primary transition-colors stroke-[1]" />
                </div>
                <span className={cn(
                    "text-[9px] font-bold uppercase tracking-[0.4em] px-2 py-0.5 border rounded-none",
                    status === 'online' ? "text-primary border-primary/20 bg-primary/5" : "text-red-400 border-red-400/20 bg-red-400/5"
                )}>
                    {status}
                </span>
            </header>

            <div className="space-y-6">
                <div>
                    <h3 className="text-[15px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">{name}</h3>
                    <p className="text-[11px] text-foreground/30 leading-relaxed font-light mt-1">{description}</p>
                </div>

                {latency !== undefined ? (
                    <div className="flex items-baseline gap-2 pt-4">
                        <span className="text-3xl font-light text-foreground/90 tabular-nums">{latency}</span>
                        <span className="text-[10px] text-foreground/20 font-bold uppercase tracking-widest">ms</span>
                    </div>
                ) : (
                    <div className="h-10 pt-4">
                        <span className="text-[11px] font-mono text-foreground/10 uppercase tracking-[0.2em] italic">[NO_LATENCY_DATA]</span>
                    </div>
                )}
            </div>

            <div className="mt-8 h-px w-full bg-foreground/5 overflow-hidden">
                <div
                    className={cn(
                        "h-full transition-all duration-1000",
                        status === 'online' ? "bg-primary w-full" : "bg-foreground/10 w-0"
                    )}
                />
            </div>
        </div>
    );

    return (
        <AppLayout>
            <div className="flex-1 max-w-6xl mx-auto w-full py-12 md:py-20 px-8">
                <header className="mb-20 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div className="space-y-4">
                        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 block underline decoration-primary/30 underline-offset-8">Infrastructure Matrix</span>
                        <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground/90">System Nexus</h1>
                        <p className="text-[10px] text-foreground/10 font-mono flex items-center gap-2 uppercase tracking-[0.4em]">
                            <Fingerprint className="h-3 w-3 stroke-[1]" />
                            Instance_MD: <span className="text-foreground/40">node-alpha-01.pandora.local</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-8 bg-foreground/[0.02] p-6 border border-border/5">
                        <div className="text-right">
                            <p className="text-[9px] uppercase tracking-[0.4em] text-foreground/10 font-bold mb-1">Temporal Sync</p>
                            <p className="text-xl font-mono text-primary tabular-nums">
                                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString([], { hour12: false }) : '--:--:--'}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchHealth}
                            disabled={loading}
                            className="rounded-none h-12 w-12 border-foreground/5 hover:border-primary/20 bg-transparent active:scale-95 transition-all shadow-none"
                        >
                            <RefreshCw className={cn("h-4 w-4 stroke-[1]", loading && "animate-spin")} />
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/5">
                    <ServiceMetric
                        name="The Architect (Inference)"
                        status={health?.inference.status || 'checking'}
                        latency={health?.inference.latency}
                        icon={BrainCircuit}
                        description="Core response synthesis engine"
                    />
                    <ServiceMetric
                        name="The Vault (Qdrant)"
                        status={health?.qdrant.status || 'checking'}
                        latency={health?.qdrant.latency}
                        icon={Database}
                        description="Semantic retrieval latency"
                    />
                    <ServiceMetric
                        name="The Ledger (Firebase)"
                        status={health?.firebase.status || 'checking'}
                        icon={ShieldCheck}
                        description="User persistence and identity"
                    />
                </div>

                <div className="mt-20 space-y-px bg-border/5 border border-border/5">
                    <div className="p-8 bg-background">
                        <header className="flex justify-between items-center mb-10">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <Activity className="h-4 w-4 text-primary stroke-[1]" />
                                    <h4 className="text-[11px] font-bold uppercase tracking-[0.4em] text-foreground/40">Latency Telemetry</h4>
                                </div>
                                <p className="text-[10px] text-foreground/10 font-mono uppercase tracking-[0.4em] pl-7">Real-time throughput metrics</p>
                            </div>
                        </header>

                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                                    <XAxis
                                        dataKey="time"
                                        stroke="rgba(0,0,0,0.1)"
                                        fontSize={9}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="rgba(0,0,0,0.1)"
                                        fontSize={9}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}ms`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid rgba(0,0,0,0.05)',
                                            borderRadius: '0',
                                            fontSize: '10px',
                                            color: '#000',
                                            boxShadow: 'none'
                                        }}
                                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                                    />
                                    <Area
                                        type="stepAfter"
                                        dataKey="inference"
                                        name="Brain_MS"
                                        stroke="#007AFF"
                                        strokeWidth={1}
                                        fill="#007AFF"
                                        fillOpacity={0.05}
                                        animationDuration={1000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border/5">
                        <div className="p-8 bg-background">
                            <h5 className="text-[11px] font-bold uppercase tracking-[0.4em] text-foreground/40 mb-8 flex items-center gap-3">
                                <Server className="h-4 w-4 stroke-[1]" /> Infrastructure Logs
                            </h5>
                            <div className="space-y-4 font-mono text-[10px]">
                                {[
                                    { time: '08:12:04', log: 'SYNC_SUCCESS: QDRANT_NODE_01' },
                                    { time: '08:14:15', log: 'INIT: INFERENCE_WARMUP(LLAMA_3)' },
                                    { time: '08:14:22', log: 'JOB_DONE: MEMORY_CONSOLIDATION_428' },
                                    { time: '08:14:25', log: 'STATUS: ALL_SYSTEMS_NOMINAL' },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex gap-6 p-3 border-l-2 border-primary/20 bg-foreground/[0.02] transition-colors hover:bg-foreground/[0.04]">
                                        <span className="text-foreground/20 font-bold tabular-nums">{item.time}</span>
                                        <span className="text-foreground/50 uppercase tracking-tight">{item.log}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 bg-background">
                            <h5 className="text-[11px] font-bold uppercase tracking-[0.3em] text-foreground/40 mb-8 flex items-center gap-3">
                                <Cpu className="h-4 w-4 stroke-[1.5]" /> Sovereign Load
                            </h5>
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/10">
                                        <span>Brain Saturation</span>
                                        <span className="text-primary tracking-tighter tabular-nums font-mono">
                                            {health?.inference.status === 'online' ? '24%' : '0%'}
                                        </span>
                                    </div>
                                    <div className="h-[2px] w-full bg-foreground/5 overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-1000"
                                            style={{ width: health?.inference.status === 'online' ? '24%' : '0%' }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-foreground/30">
                                        <span>Vault Density</span>
                                        <span className="text-foreground/80 tracking-tighter tabular-nums font-mono">15,420 PT</span>
                                    </div>
                                    <div className="h-[2px] w-full bg-foreground/5 overflow-hidden">
                                        <div
                                            className="h-full bg-foreground/10 transition-all duration-1000"
                                            style={{ width: '68%' }}
                                        />
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-foreground/5">
                                    <p className="text-[10px] text-foreground/20 italic leading-relaxed uppercase tracking-tighter">
                                        Instance operating in local autonomy mode. Data persistence strictly local to host node. Private keys active.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
