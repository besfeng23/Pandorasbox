'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { generateUserApiKey } from '@/app/actions';
import { useUser } from '@/firebase';
import { KeyRound, Copy, Check, Loader2 } from 'lucide-react';

interface APIKeyManagerProps {
  currentKey?: string;
  onKeyUpdated?: (key: string) => void;
}

export function APIKeyManager({ currentKey = '', onKeyUpdated }: APIKeyManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [hasCopiedKey, setHasCopiedKey] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();

  const handleGenerateApiKey = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to generate an API key.' });
      return;
    }

    startTransition(async () => {
      const token = await user.getIdToken();
      const result = await generateUserApiKey(token);

      if (result.success && result.apiKey) {
        onKeyUpdated?.(result.apiKey);
        toast({
          title: 'API key generated',
          description: 'Your new API key has been generated and saved. Keep it secret!'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed',
          description: result.message || 'Could not generate API key.'
        });
      }
    });
  };

  const handleCopyKey = async () => {
    if (!currentKey) return;

    try {
      await navigator.clipboard.writeText(currentKey);
      setHasCopiedKey(true);
      setTimeout(() => setHasCopiedKey(false), 2000);
      toast({ title: 'Copied', description: 'API key copied to clipboard.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed', description: 'Could not copy to clipboard.' });
    }
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return `${key.substring(0, 4)}${'•'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/40 mb-1">Personal Substrate Key</div>
          <div className="text-[11px] text-muted-foreground/40 font-mono tracking-tighter">
            Integration identifier. Restricted access.
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleGenerateApiKey}
          disabled={isPending || !user}
          className="h-9 px-4 text-[10px] uppercase font-bold tracking-widest text-primary/60 hover:text-primary hover:bg-muted"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2 stroke-[1]" /> : <KeyRound className="h-3 w-3 mr-2 stroke-[1]" />}
          Initialize New Key
        </Button>
      </div>

      <div className="flex items-center gap-2 p-1.5 rounded-lg border border-border/10 bg-muted/5 group">
        <Input
          value={currentKey ? maskKey(currentKey) : ''}
          readOnly
          placeholder="Substrate offline"
          className="flex-1 bg-transparent border-none focus-visible:ring-0 font-mono text-xs text-foreground/60 h-8"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopyKey}
          disabled={!currentKey || hasCopiedKey}
          className="h-8 w-8 text-foreground/20 hover:text-foreground opacity-40 group-hover:opacity-100 transition-opacity"
        >
          {hasCopiedKey ? <Check className="h-3 w-3 stroke-[1]" /> : <Copy className="h-3 w-3 stroke-[1]" />}
        </Button>
      </div>
    </div>
  );
}

