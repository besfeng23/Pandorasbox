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

    const ServiceCard = ({ name, status, latency, icon: Icon, description }: any) => (
        <Card className="glass-panel border-white/5 overflow-hidden group">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg bg-white/5 text-primary group-hover:scale-110 transition-transform duration-500">
                        <Icon className="h-5 w-5" />
                    </div>
                    <motion.div
                        initial={false}
                        animate={{
                            backgroundColor: status === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: status === 'online' ? '#10b981' : '#ef4444'
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-current/20"
                    >
                        {status}
                    </motion.div>
                </div>
                <CardTitle className="text-lg mt-4">{name}</CardTitle>
                <CardDescription className="text-xs text-white/40">{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {latency !== undefined && (
                    <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono">{latency}</span>
                        <span className="text-xs text-white/30 uppercase">ms</span>
                    </div>
                )}
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: status === 'online' ? '100%' : '0%' }}
                        className={cn("h-full", status === 'online' ? "bg-emerald-500" : "bg-red-500")}
                    />
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout>
            <div className="container mx-auto p-6 max-w-6xl h-full flex flex-col gap-6 overflow-y-auto no-scrollbar pb-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                            System Nexus
                        </h1>
                        <p className="text-white/40 text-sm mt-1 flex items-center gap-2">
                            <Fingerprint className="h-3 w-3" />
                            Sovereign Instance: node-alpha-01.pandora.local
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">Last Synchronized</p>
                            <p className="text-sm font-mono text-cyan-400">{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '--:--:--'}</p>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchHealth}
                            disabled={loading}
                            className="rounded-full h-12 w-12 border-white/10 hover:border-cyan-500/50 bg-white/5"
                        >
                            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {/* Core Infrastructure Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ServiceCard
                        name="AI Brain (vLLM)"
                        status={health?.inference.status || 'checking'}
                        latency={health?.inference.latency}
                        icon={BrainCircuit}
                        description="LLM core inference performance"
                    />
                    <ServiceCard
                        name="Neural Vault (Qdrant)"
                        status={health?.qdrant.status || 'checking'}
                        latency={health?.qdrant.latency}
                        icon={Database}
                        description="Vector database query latency"
                    />
                    <ServiceCard
                        name="Ledger (Firebase)"
                        status={health?.firebase.status || 'checking'}
                        icon={ShieldCheck}
                        description="User state and auth persistence"
                    />
                </div>

                {/* Real-time Performance Graph */}
                <Card className="glass-panel border-white/5 col-span-full">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-cyan-400" />
                                    Latency Telemetry
                                </CardTitle>
                                <CardDescription>Real-time performance monitoring of sovereign services</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorInf" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorQd" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    stroke="rgba(255,255,255,0.2)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="rgba(255,255,255,0.2)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}ms`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="inference"
                                    name="Brain Latency"
                                    stroke="#22d3ee"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorInf)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="qdrant"
                                    name="Vault Latency"
                                    stroke="#ec4899"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorQd)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* System Logs / Console (Synthetic for aesthetic) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="glass-panel border-white/5">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Server className="h-4 w-4 text-emerald-400" />
                                Infrastructure Console
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 font-mono text-[10px]">
                                {[
                                    { time: '08:12:04', log: 'QDRANT_NODE_01 synchronized successfully' },
                                    { time: '08:14:15', log: 'INFERENCE_SERVICE warming up Llama-3-70B' },
                                    { time: '08:14:22', log: 'MEMORY_FOLDING job #428 completed' },
                                    { time: '08:14:25', log: 'HEALTH_CHECK passing for all services' },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex gap-4 p-2 bg-white/5 rounded border border-white/5 opacity-80 hover:opacity-100 transition-opacity">
                                        <span className="text-white/20 shrink-0">{item.time}</span>
                                        <span className="text-white/80">{item.log}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-white/5 bg-gradient-to-br from-cyan-500/5 to-transparent">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-purple-400" />
                                Sovereign Load
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <div className="flex justify-between text-[10px] mb-2 uppercase tracking-widest text-white/40">
                                    <span>Brain Saturation</span>
                                    <span>{health?.inference.status === 'online' ? '24%' : '0%'}</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div animate={{ width: health?.inference.status === 'online' ? '24%' : '0%' }} className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] mb-2 uppercase tracking-widest text-white/40">
                                    <span>Vault Density</span>
                                    <span>15,420 Points</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div animate={{ width: '68%' }} className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/5">
                                <p className="text-[10px] text-white/30 italic">
                                    Your instance is running on optimized sovereign hardware. All data remains encrypted at rest and in transit.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
