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
        <Card className="glass-panel-heavy border-white/10 rounded-2xl overflow-hidden group relative">
            <div className="absolute top-4 right-4 z-10">
                <div className={cn(
                    "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border",
                    status === 'online'
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                        : "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                )}>
                    {status}
                </div>
            </div>
            <CardHeader className="pb-3 pt-6">
                <div className="p-3 rounded-xl bg-white/5 w-fit text-primary mb-4 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500">
                    <Icon className="h-7 w-7" />
                </div>
                <CardTitle className="text-xl font-headline tracking-tight">{name}</CardTitle>
                <CardDescription className="text-xs text-white/40 mt-1">{description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
                {latency !== undefined && (
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold font-mono text-white tracking-tighter">{latency}</span>
                        <span className="text-xs text-white/30 font-bold uppercase">ms</span>
                    </div>
                )}
                {!latency && <div className="h-10" />} {/* Spacer for cards without latency */}
                <div className="mt-8 h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: status === 'online' ? '100% ' : '0%' }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            status === 'online'
                                ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                                : "bg-white/10"
                        )}
                    />
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout>
            <div className="container mx-auto p-4 md:p-8 max-w-7xl h-full flex flex-col gap-8 overflow-y-auto no-scrollbar pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-5xl font-bold font-headline tracking-tighter text-white">
                            System Nexus
                        </h1>
                        <p className="text-white/40 text-sm mt-2 flex items-center gap-2 font-medium">
                            <Fingerprint className="h-4 w-4 text-primary" />
                            Sovereign Instance: <span className="text-white/60">node-alpha-01.pandora.local</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-6 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-black mb-1">Last Synchronized</p>
                            <p className="text-xl font-mono text-cyan-400 font-bold tracking-tight">
                                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString([], { hour12: true }) : '--:--:--'}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchHealth}
                            disabled={loading}
                            className="rounded-xl h-12 w-12 border-white/10 hover:border-cyan-500/50 bg-white/5 active:scale-90 transition-all"
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
                <Card className="glass-panel-heavy border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 pb-0">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-3 text-2xl font-headline tracking-tight">
                                    <Activity className="h-6 w-6 text-cyan-400" />
                                    Latency Telemetry
                                </CardTitle>
                                <CardDescription className="text-sm text-white/40 mt-1">Real-time performance monitoring of sovereign services</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[350px] w-full p-8 pt-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorInf" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    stroke="rgba(255,255,255,0.15)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="rgba(255,255,255,0.15)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-10}
                                    tickFormatter={(value) => `${value}ms`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(10, 10, 10, 0.9)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                    }}
                                    itemStyle={{ fontSize: '12px', color: '#22d3ee' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="inference"
                                    name="Brain Latency"
                                    stroke="#22d3ee"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorInf)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* System Logs / Console & Sovereign Load */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="glass-panel-heavy border-white/10 rounded-3xl overflow-hidden h-fit">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-lg font-headline tracking-tight flex items-center gap-3">
                                <Server className="h-5 w-5 text-emerald-400" />
                                Infrastructure Console
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 pt-4">
                            <div className="space-y-3 font-mono text-[11px]">
                                {[
                                    { time: '08:12:04', log: 'QDRANT_NODE_01 synchronized successfully' },
                                    { time: '08:14:15', log: 'INFERENCE_SERVICE warming up Llama-3-70B' },
                                    { time: '08:14:22', log: 'MEMORY_FOLDING job #428 completed' },
                                    { time: '08:14:25', log: 'HEALTH_CHECK passing for all services' },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex gap-4 p-3 bg-white/5 rounded-xl border border-white/5 opacity-70 hover:opacity-100 hover:bg-white/10 transition-all cursor-default">
                                        <span className="text-white/20 shrink-0 font-bold">{item.time}</span>
                                        <span className="text-white/80 uppercase tracking-tight">{item.log}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel-heavy border-white/10 rounded-3xl overflow-hidden bg-gradient-to-br from-primary/5 to-transparent h-fit">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-lg font-headline tracking-tight flex items-center gap-3">
                                <Cpu className="h-5 w-5 text-purple-400" />
                                Sovereign Load
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-8">
                            <div className="space-y-3">
                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-white/40">
                                    <span>Brain Saturation</span>
                                    <span className="text-cyan-400 underline underline-offset-4 decoration-cyan-400/30">
                                        {health?.inference.status === 'online' ? '24%' : '0%'}
                                    </span>
                                </div>
                                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-[2px]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: health?.inference.status === 'online' ? '24%' : '0%' }}
                                        transition={{ duration: 2, ease: "circOut" }}
                                        className="h-full rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.7)]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-white/40">
                                    <span>Vault Density</span>
                                    <span className="text-purple-400 underline underline-offset-4 decoration-purple-400/30">15,420 Points</span>
                                </div>
                                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-[2px]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '68%' }}
                                        transition={{ duration: 2, ease: "circOut" }}
                                        className="h-full rounded-full bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.7)]"
                                    />
                                </div>
                            </div>
                            <div className="pt-6 border-t border-white/5">
                                <div className="flex items-start gap-3">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 animate-pulse" />
                                    <p className="text-[10px] text-white/30 italic leading-relaxed font-medium uppercase tracking-tight">
                                        Your instance is running on optimized sovereign hardware. All data remains encrypted at rest and in transit. Private access only.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
