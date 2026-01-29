
'use client';

import React from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { PhaseGrid } from '@/components/pandora/phase-grid';
import { NeuralCube } from '@/components/pandora/neural-cube';
import { TelemetryGraph } from '@/components/pandora/telemetry-graph';
import { Badge } from '@/components/ui/badge';
import { Cpu, Zap, Activity, HardDrive } from 'lucide-react';

export default function PandoraUI() {
    return (
        <AppLayout>
            <div className="min-h-screen bg-black text-foreground font-mono overflow-y-auto w-full">
                {/* Header Overlay */}
                <div className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-primary rounded-full animate-pulse shadow-[0_0_10px_var(--primary)]" />
                        <h1 className="text-xl font-bold tracking-widest uppercase">
                            Sovereign AI <span className="text-primary">//</span> Neural Core
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge variant="outline" className="border-green-500/50 text-green-500 bg-green-500/10">
                            <Zap className="w-3 h-3 mr-1" />
                            SYSTEM ONLINE
                        </Badge>
                        <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
                            <Activity className="w-3 h-3 mr-1" />
                            COGNITION STABLE
                        </Badge>
                    </div>
                </div>

                {/* Main Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 md:p-8">

                    {/* Left Column: Phase Grid */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold flex items-center">
                                <Cpu className="mr-2 h-6 w-6 text-primary" />
                                Evolutionary Phases
                            </h2>
                            <span className="text-xs text-muted-foreground">V 1.0.0-ALPHA</span>
                        </div>
                        <PhaseGrid />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                            <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                                <h3 className="text-sm font-semibold mb-2 text-primary">Active Directives</h3>
                                <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                                    <li>Maintain data sovereignty at all costs.</li>
                                    <li>Optimize retrieval latency (Target: &lt;200ms).</li>
                                    <li>Synthesize memory across disjointed sessions.</li>
                                </ul>
                            </div>
                            <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                                <h3 className="text-sm font-semibold mb-2 text-primary">System Health</h3>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span>Vector DB</span>
                                    <span className="text-green-500">Connected</span>
                                </div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span>Inference API</span>
                                    <span className="text-green-500">Connected</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span>Memory Usage</span>
                                    <span className="text-yellow-500">42% (Warning)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Visualizer & Telemetry */}
                    <div className="lg:col-span-4 flex flex-col gap-6">

                        {/* The Cube */}
                        <div className="w-full flex items-center justify-center py-12 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.1)_0%,transparent_70%)] rounded-3xl border border-white/5">
                            <NeuralCube />
                        </div>

                        {/* Telemetry */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <HardDrive className="h-4 w-4" />
                                Neural Telemetry
                            </h3>
                            <TelemetryGraph />
                        </div>

                        {/* Console Output */}
                        <div className="flex-1 min-h-[200px] p-4 font-mono text-xs bg-black border border-white/20 rounded-xl overflow-y-auto font-green-500 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                            <div className="space-y-1 text-green-500/80">
                                <p>[SYSTEM] Initializing Neural Core...</p>
                                <p>[SYSTEM] Loading memory modules...</p>
                                <p>[OK] Vector database connected.</p>
                                <p>[OK] Phase 1-5 active.</p>
                                <p>[WARN] Phase 7 self-healing inactive.</p>
                                <p className="animate-pulse">_</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}
