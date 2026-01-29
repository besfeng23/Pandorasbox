
'use client';

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function TelemetryGraph() {
    const [data, setData] = useState<{ time: string, tps: number, memory: number }[]>([]);

    useEffect(() => {
        // Generate initial dummy data
        const initialData = Array.from({ length: 20 }, (_, i) => ({
            time: i.toString(),
            tps: 40 + Math.random() * 20,
            memory: 30 + Math.random() * 10
        }));
        setData(initialData);

        // Live update simulation
        const interval = setInterval(() => {
            setData(prev => {
                const newPoint = {
                    time: new Date().toLocaleTimeString(),
                    tps: 40 + Math.random() * 30, // Random Token/s between 40-70
                    memory: 30 + Math.random() * 15 // Random Mock Memory Load
                };
                return [...prev.slice(1), newPoint];
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-64 p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
            <h3 className="text-xs font-mono uppercase text-muted-foreground mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Neural Telemetry (TPS / Load)
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorTps" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
                        labelStyle={{ display: 'none' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="tps"
                        stroke="var(--primary)"
                        fillOpacity={1}
                        fill="url(#colorTps)"
                        isAnimationActive={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="memory"
                        stroke="#8884d8"
                        fillOpacity={1}
                        fill="url(#colorMemory)"
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
