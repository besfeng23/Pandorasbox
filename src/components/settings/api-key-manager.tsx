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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">Personal API key</div>
          <div className="text-xs text-muted-foreground">
            Used for integrations. Keep it secret.
          </div>
        </div>
        <Button onClick={handleGenerateApiKey} disabled={isPending || !user}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Generate
        </Button>
      </div>

      <div className="flex gap-2">
        <Input 
          value={currentKey ? maskKey(currentKey) : ''} 
          readOnly 
          placeholder="No key generated yet" 
          className="font-mono text-sm"
        />
        <Button 
          variant="outline" 
          onClick={handleCopyKey} 
          disabled={!currentKey || hasCopiedKey}
          title="Copy API key"
        >
          {hasCopiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

