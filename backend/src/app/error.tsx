'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { StateBlock } from '@/components/ui/state-block';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <StateBlock
        icon={<AlertCircle className="h-8 w-8 text-destructive" />}
        title="Something went wrong"
        description={error.message || 'An unexpected error occurred.'}
        action={{ label: 'Try again', onClick: reset }}
        className="w-full max-w-xl"
      />
    </div>
  );
}
