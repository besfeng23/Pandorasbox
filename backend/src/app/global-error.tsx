'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('[Global Error Boundary]:', error);
    }, [error]);

    return (
        <html>
            <body className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
                <div className="max-w-md space-y-4 text-center">
                    <h2 className="text-2xl font-bold">Something went wrong!</h2>
                    <div className="p-4 bg-muted/50 rounded-lg text-sm text-left overflow-auto max-h-[200px]">
                        <p className="font-mono text-red-500 mb-2">{error.message}</p>
                        {error.digest && (
                            <p className="text-xs text-muted-foreground">
                                Digest: <span className="font-mono select-all bg-muted p-1 rounded">{error.digest}</span>
                            </p>
                        )}
                    </div>
                    <Button onClick={() => reset()}>Try again</Button>
                </div>
            </body>
        </html>
    );
}
