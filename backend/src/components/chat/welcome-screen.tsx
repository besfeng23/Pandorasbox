'use client';

import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Bot, BrainCircuit, PlusCircle } from 'lucide-react';
import { createThread } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface WelcomeScreenProps {
  onThreadCreated?: (id: string) => void;
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
    } catch (error: any) {
      console.error('Error creating thread:', error);
      toast({ variant: 'destructive', title: 'Failed to create thread', description: error.message || 'An unknown error occurred.' });
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center px-4 py-6 text-center">
      <h1 className="text-title-1">Welcome to Pandora&apos;s Box</h1>
      <p className="mt-3 max-w-2xl text-subhead text-muted-foreground">
        Your personal AI workspace for building, exploring, and retaining context across conversations.
      </p>
      <Card className="mt-7 w-full max-w-4xl text-left">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-xl md:justify-start">
            <PlusCircle className="h-5 w-5 text-primary" />
            Create your first thread
          </CardTitle>
          <CardDescription>Choose an agent. You can switch between them at any time.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col space-y-3 rounded-lg border border-border/80 p-5">
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Builder Agent</h3>
            <p className="flex-grow text-sm text-muted-foreground">
              Collaborative support for planning, drafting, and structured execution.
            </p>
            <Button onClick={() => handleCreateThread('builder')} className="mt-auto">
              Start with Builder
            </Button>
          </div>
          <div className="flex flex-col space-y-3 rounded-lg border border-border/80 p-5">
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <BrainCircuit className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Universe Agent</h3>
            <p className="flex-grow text-sm text-muted-foreground">
              Broad exploration and research support for questions and knowledge synthesis.
            </p>
            <Button onClick={() => handleCreateThread('universe')} className="mt-auto">
              Start with Universe
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
