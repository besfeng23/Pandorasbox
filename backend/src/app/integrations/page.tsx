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
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Local Services Status</h2>
              <p className="text-sm text-muted-foreground">
                Monitor your sovereign AI infrastructure
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {services.map((service) => (
            <Card
              key={service.id}
              className={cn(
                "relative overflow-hidden transition-all",
                service.status === 'online' && "border-green-500/30",
                service.status === 'offline' && "border-destructive/30"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "p-3 rounded-xl",
                    service.status === 'online' ? "bg-green-500/10" : "bg-muted"
                  )}>
                    {service.icon}
                  </div>
                  {getStatusBadge(service.status)}
                </div>
                <CardTitle className="mt-3">{service.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {service.endpoint && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Endpoint:</span> {service.endpoint}
                    </div>
                  )}
                  {service.status === 'online' && service.latency !== undefined && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Latency:</span> {service.latency}ms
                    </div>
                  )}
                  {service.status === 'offline' && (
                    <div className="text-destructive text-sm">
                      Service unavailable. Check docker-compose.yml and ensure the container is running.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle>Sovereign Stack</CardTitle>
            <CardDescription>
              All AI processing runs 100% locally. No data leaves your infrastructure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>vLLM: Local LLM inference (no OpenAI API calls)</li>
              <li>Qdrant: Private vector database (no cloud embeddings)</li>
              <li>Embeddings: Self-hosted embedding model</li>
              <li>Whisper: Local audio transcription</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
