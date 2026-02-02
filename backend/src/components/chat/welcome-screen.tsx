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
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 mb-4 block">Sovereign OS v1.0</span>
        <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground/90">Pandora's Box</h1>
      </div>

      <p className="mb-16 text-base text-muted-foreground/60 max-w-md leading-relaxed">
        Personal intelligence, private by default. Choose your interface to begin.
      </p>

      <div className="grid gap-12 md:grid-cols-2 w-full px-4">
        <div className="flex flex-col items-center space-y-6 group cursor-pointer" onClick={() => handleCreateThread('builder')}>
          <div className="h-16 w-16 rounded-full border border-border/40 flex items-center justify-center transition-all group-hover:border-primary/40 group-hover:bg-primary/5">
            <Bot className="h-6 w-6 text-foreground/40 group-hover:text-primary stroke-[1]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Builder</h3>
            <p className="text-xs text-muted-foreground/50 max-w-[240px] leading-normal">
              Code generation, structural thinking, and engineering tasks.
            </p>
          </div>
          <Button variant="ghost" className="text-[10px] uppercase tracking-widest font-bold text-primary/60 hover:text-primary hover:bg-transparent">
            Initialize Lane
          </Button>
        </div>

        <div className="flex flex-col items-center space-y-6 group cursor-pointer" onClick={() => handleCreateThread('universe')}>
          <div className="h-16 w-16 rounded-full border border-border/40 flex items-center justify-center transition-all group-hover:border-primary/40 group-hover:bg-primary/5">
            <BrainCircuit className="h-6 w-6 text-foreground/40 group-hover:text-primary stroke-[1]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Universe</h3>
            <p className="text-xs text-muted-foreground/50 max-w-[240px] leading-normal">
              General knowledge, creative synthesis, and archival recall.
            </p>
          </div>
          <Button variant="ghost" className="text-[10px] uppercase tracking-widest font-bold text-primary/60 hover:text-primary hover:bg-transparent">
            Open Substrate
          </Button>
        </div>
      </div>
    </div>
  );
}

