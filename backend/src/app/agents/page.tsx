'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bot } from 'lucide-react';
import { useUser } from '@/firebase';
import { PageHeader, PageShell } from '@/components/ui/page-shell';
import { StateBlock } from '@/components/ui/state-block';

interface AgentCapability {
  name: string;
  description: string;
}

export default function AgentsPage() {
  const [activeCapabilities, setActiveCapabilities] = useState<AgentCapability[]>([]);
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(true);

  const { toast } = useToast();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      setIsLoadingCapabilities(false);
      setActiveCapabilities([]);
      return;
    }

    const getCapabilities = async () => {
      setIsLoadingCapabilities(true);
      try {
        const token = await user.getIdToken();
        const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

        const response = await fetch(`${API_URL}/api/agents`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch active capabilities.' }));
          throw new Error(errorData.message);
        }
        const data = await response.json();
        setActiveCapabilities(data.agents);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error fetching capabilities', description: error.message });
        setActiveCapabilities([]);
      } finally {
        setIsLoadingCapabilities(false);
      }
    };

    getCapabilities();
  }, [user, toast]);

  return (
    <AppLayout>
      <PageShell>
        <PageHeader
          title="Active AI Capabilities"
          description="These tools and capabilities are currently available to your AI agents."
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Available Tools</CardTitle>
            <CardDescription>Capabilities exposed through the current backend and permission model.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCapabilities ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : activeCapabilities.length === 0 ? (
              <StateBlock
                icon={<Bot className="h-8 w-8" />}
                title="No active capabilities"
                description="Ensure backend services are running and your account has access to configured agents."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeCapabilities.map((capability) => (
                  <Card key={capability.name} className="border-border/80">
                    <CardHeader>
                      <CardTitle className="text-lg">{capability.name}</CardTitle>
                      <CardDescription>{capability.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </AppLayout>
  );
}
