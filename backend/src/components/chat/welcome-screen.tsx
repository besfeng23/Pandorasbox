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
        if (onThreadCreated) {
          onThreadCreated(result.id);
        } else {
          router.push(`/chat/${result.id}`);
        }
      }
    } catch (error: any) {
      console.error('Error creating thread:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to create thread',
        description: error.message || 'An unknown error occurred.',
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
      <h1 className="font-headline text-4xl font-bold tracking-tight">Welcome to Pandora's Box</h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
        Your personal AI companion for building and exploring. Let's get you started.
      </p>
      <Card className="mt-8 w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <PlusCircle className="h-6 w-6 text-primary" />
            Create your first thread
          </CardTitle>
          <CardDescription>
            Choose an agent to start a new conversation. Each agent has a unique purpose.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col space-y-3 rounded-lg border p-6 text-left hover:bg-accent/50 transition-colors">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Builder Agent</h3>
            <p className="flex-grow text-sm text-muted-foreground">
              The Builder agent helps you create and refine ideas. It's your collaborative partner for brainstorming, writing, and problem-solving.
            </p>
            <Button onClick={() => handleCreateThread('builder')} className="mt-auto">
              Start with Builder
            </Button>
          </div>
          <div className="flex flex-col space-y-3 rounded-lg border p-6 text-left hover:bg-accent/50 transition-colors">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <BrainCircuit className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Universe Agent</h3>
            <p className="flex-grow text-sm text-muted-foreground">
              The Universe agent has access to a broad range of knowledge. Use it to learn new things, explore topics, and get answers to your questions.
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

