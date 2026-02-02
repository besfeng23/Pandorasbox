'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Database, Brain, Mic } from 'lucide-react';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';

interface ServiceStatus {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'online' | 'offline' | 'checking';
  latency?: number;
  endpoint?: string;
}

export default function IntegrationsPage() {
  const { user } = useUser();
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      id: 'vllm',
      name: 'vLLM Inference',
      description: 'Local LLM inference server (Mistral-7B)',
      icon: <Brain className="h-6 w-6" />,
      status: 'checking',
      endpoint: process.env.NEXT_PUBLIC_INFERENCE_URL || 'http://localhost:8000',
    },
    {
      id: 'qdrant',
      name: 'Qdrant Vector DB',
      description: 'Vector database for semantic memory search',
      icon: <Database className="h-6 w-6" />,
      status: 'checking',
      endpoint: process.env.NEXT_PUBLIC_QDRANT_URL || 'http://localhost:6333',
    },
    {
      id: 'embeddings',
      name: 'Embeddings Service',
      description: 'Text embedding generation (BAAI/bge-small-en-v1.5)',
      icon: <Server className="h-6 w-6" />,
      status: 'checking',
      endpoint: process.env.NEXT_PUBLIC_EMBEDDINGS_URL || 'http://localhost:8080',
    },
    {
      id: 'whisper',
      name: 'Whisper ASR',
      description: 'Audio transcription service',
      icon: <Mic className="h-6 w-6" />,
      status: 'checking',
      endpoint: 'http://localhost:9000',
    },
  ]);

  useEffect(() => {
    const checkServices = async () => {
      const updatedServices: ServiceStatus[] = await Promise.all(
        services.map(async (service): Promise<ServiceStatus> => {
          try {
            const start = Date.now();
            let response: Response | null = null;

            switch (service.id) {
              case 'vllm':
                const vllmUrl = (service.endpoint || 'http://localhost:8000').replace('/v1', '');
                response = await fetch(`${vllmUrl}/v1/models`, {
                  signal: AbortSignal.timeout(2000),
                });
                break;
              case 'qdrant':
                response = await fetch(`${service.endpoint || 'http://localhost:6333'}/collections`, {
                  signal: AbortSignal.timeout(2000),
                });
                break;
              case 'embeddings':
                response = await fetch(`${service.endpoint || 'http://localhost:8080'}/health`, {
                  signal: AbortSignal.timeout(2000),
                });
                break;
              case 'whisper':
                response = await fetch(`${service.endpoint || 'http://localhost:9000'}/health`, {
                  signal: AbortSignal.timeout(2000),
                });
                break;
            }

            const latency = Date.now() - start;
            const isOnline = response?.ok || response?.status === 404; // 404 might mean server is up but endpoint doesn't exist

            return {
              ...service,
              status: (isOnline ? 'online' : 'offline') as 'online' | 'offline',
              latency: isOnline ? latency : undefined,
            };
          } catch (error) {
            return {
              ...service,
              status: 'offline' as const,
            };
          }
        })
      );

      setServices(updatedServices);
    };

    if (user) {
      checkServices();
      const interval = setInterval(checkServices, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const getStatusBadge = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            Online
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="destructive">
            Offline
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Checking...
          </Badge>
        );
    }
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="flex-1 max-w-6xl mx-auto w-full py-12 md:py-20 px-8">
        <header className="mb-16">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 block underline decoration-primary/30 underline-offset-8 mb-4">Node Configuration</span>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground/90">Sovereign Cluster</h1>
          <p className="text-[13px] text-foreground/30 mt-6 max-w-xl leading-relaxed italic border-l border-foreground/5 pl-6">
            Global monitoring of local dependency matrices. All nodes operating in isolated containment mode.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/5 mb-20">
          {services.map((service) => (
            <div
              key={service.id}
              className={cn(
                "group relative p-10 bg-background border border-border/5 transition-all duration-500 hover:border-primary/20",
                service.status === 'online' ? "bg-primary/[0.005]" : "bg-red-400/[0.005]"
              )}
            >
              <header className="flex items-start justify-between mb-8">
                <div className={cn(
                  "p-4 border transition-colors flex items-center justify-center h-12 w-12",
                  service.status === 'online' ? "bg-primary/5 border-primary/20 text-primary" : "bg-foreground/[0.03] border-foreground/5 text-foreground/20"
                )}>
                  {service.icon}
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-widest px-3 py-1 border",
                  service.status === 'online' ? "text-primary border-primary/20 bg-primary/5" : "text-red-400 border-red-400/20 bg-red-400/5"
                )}>
                  {service.status.toUpperCase()}
                </span>
              </header>

              <div className="space-y-6">
                <div>
                  <h3 className="text-[16px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">{service.name}</h3>
                  <p className="text-[11px] text-foreground/30 leading-relaxed font-light mt-2 line-clamp-2">
                    {service.description}
                  </p>
                </div>

                <div className="space-y-3 font-mono text-[10px] pt-4 border-t border-foreground/5">
                  {service.endpoint && (
                    <div className="flex items-center justify-between text-foreground/30">
                      <span className="uppercase tracking-widest">ENDPOINT</span>
                      <span className="text-foreground/60 tabular-nums">{service.endpoint}</span>
                    </div>
                  )}
                  {service.status === 'online' && service.latency !== undefined && (
                    <div className="flex items-center justify-between text-foreground/30">
                      <span className="uppercase tracking-widest">LATENCY</span>
                      <span className="text-primary tabular-nums font-bold">{service.latency} MS</span>
                    </div>
                  )}
                  {service.status === 'offline' && (
                    <p className="text-red-400/60 uppercase tracking-tighter leading-tight italic">
                      [CRITICAL_FAILURE]: Ensure container is active in docker-compose schema.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-8 h-[2px] w-full bg-foreground/5 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-1000",
                    service.status === 'online' ? "bg-primary w-full" : "bg-foreground/10 w-0"
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        <section className="pt-16 border-t border-border/5">
          <div className="flex items-center gap-4 mb-8">
            <Server className="h-4 w-4 text-primary stroke-[1.5]" />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-foreground/30">Sovereign Architecture Specification</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { label: 'BRAIN', desc: 'Sovereign LLM inference via vLLM' },
              { label: 'VAULT', desc: 'Encrypted semantic vector storage' },
              { label: 'MAPPING', desc: 'Self-hosted embedding generation' },
              { label: 'ECHO', desc: 'Offline audio transcription' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-2">
                <p className="text-[10px] font-bold text-foreground/30 tracking-[0.4em] uppercase">{item.label}</p>
                <p className="text-[11px] text-foreground/20 leading-relaxed italic">{item.desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-20 text-[10px] text-foreground/10 font-mono text-center uppercase tracking-[0.5em]">
            Trust_Zero // Sovereign_Always // Data_Gravity_Critical
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
