'use client';

import React, { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { exportUserData } from '@/app/actions';
import { useUser } from '@/firebase';
import { Download, Loader2 } from 'lucide-react';

interface ExportMemoriesButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link';
}

export function ExportMemoriesButton({ variant = 'outline' }: ExportMemoriesButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useUser();

  const handleExport = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to export data.' });
      return;
    }

    startTransition(async () => {
      const token = await user.getIdToken();
      const result = await exportUserData(token);
      
      if (!result.success || !result.data) {
        toast({ 
          variant: 'destructive', 
          title: 'Export failed', 
          description: result.message || 'Try again.' 
        });
        return;
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pandora-export-${user.uid}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Calculate approximate size
      const bytes = new Blob([JSON.stringify(result.data)]).size;
      const sizeMB = (bytes / (1024 * 1024)).toFixed(2);

      toast({ 
        title: 'Exported', 
        description: `Downloaded your data as JSON (${sizeMB} MB).` 
      });
    });
  };

  return (
    <Button 
      variant={variant} 
      onClick={handleExport} 
      disabled={isPending || !user}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Export
        </>
      )}
    </Button>
  );
}

