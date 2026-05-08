'use client';

import { useUser } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AgentCard } from '@/components/dashboard/agent-card';
import { Bot, BrainCircuit, PlusCircle } from 'lucide-react';
import { createThread } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface WelcomeScreenProps {
  onThreadCreated?: (id: string) => void;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function WelcomeScreen({ onThreadCreated }: WelcomeScreenProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const handleCreateThread = async (agent: 'builder' | 'universe') => {
    if (!user) return;
    try {
      const result = await createThread(agent, user.uid);
      if (result?.id) {
        if (onThreadCreated) onThreadCreated(result.id);
        else router.push(`/chat/${result.id}`);
      }
    } catch (error: unknown) {
      console.error('Error creating thread:', error);
      toast({ variant: 'destructive', title: 'Failed to create thread', description: getErrorMessage(error, 'An unknown error occurred.') });
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center px-4 py-6 text-center">
      <h1 className="text-title-1">What do you want to do?</h1>
      <p className="mt-3 max-w-2xl text-subhead text-muted-foreground">
        Start a focused chat. Pick the path that matches the job.
      </p>
      <Card className="mt-7 w-full max-w-4xl text-left">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-xl md:justify-start">
            <PlusCircle className="h-5 w-5 text-primary" />
            New chat
          </CardTitle>
          <CardDescription>Ask for answers or build something concrete.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <AgentCard
            title="Ask"
            kicker="Answers"
            description="Get answers, explanations, research, and memory recall."
            actionLabel="Start asking"
            icon={BrainCircuit}
            onClick={() => handleCreateThread('universe')}
          />
          <AgentCard
            title="Build"
            kicker="Create"
            description="Draft, plan, code, write, and structure your work."
            actionLabel="Start building"
            icon={Bot}
            onClick={() => handleCreateThread('builder')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
