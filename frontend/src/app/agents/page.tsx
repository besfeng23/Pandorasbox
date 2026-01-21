
'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bot } from 'lucide-react';
import { useUser } from '@/firebase';

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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch active capabilities.' }));
                throw new Error(errorData.message);
            };
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
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="h-8 w-8" />
              Active AI Capabilities
            </h1>
            <p className="text-muted-foreground">
              These are the core tools and functions your AI assistant can currently utilize.
            </p>
          </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Available Tools</CardTitle>
                <CardDescription>
                    The following capabilities are available to your AI agents.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingCapabilities ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : activeCapabilities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-16 text-center">
                        <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-xl font-semibold tracking-tight">No active capabilities found</h3>
                        <p className="mt-2 text-muted-foreground">
                            Ensure your backend services are running and correctly configured.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {activeCapabilities.map((capability) => (
                            <Card key={capability.name} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-lg">{capability.name}</CardTitle>
                                    <CardDescription className="flex-grow">{capability.description}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
