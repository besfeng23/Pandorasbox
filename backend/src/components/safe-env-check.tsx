'use client';

import { useEffect, useState } from 'react';
import { checkEnvironmentHealth } from '@/lib/env-check';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function SafeEnvCheck({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<{ ok: boolean; errors: string[] } | null>(null);

    useEffect(() => {
        checkEnvironmentHealth().then(setStatus);
    }, []);

    if (!status) return <>{children}</>; // Render immediately, check in background

    if (!status.ok) {
        return (
            <div className="flex h-screen items-center justify-center p-8 bg-black text-white">
                <Alert variant="destructive" className="max-w-2xl border-red-500 bg-red-950/50">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                    <AlertTitle className="text-xl font-bold ml-2">Critical Production Configuration Error</AlertTitle>
                    <AlertDescription className="mt-4 space-y-2">
                        <p>The application cannot start because of the following environment issues:</p>
                        <ul className="list-disc pl-5 font-mono text-sm text-red-200">
                            {status.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                        <div className="mt-6 p-4 bg-black/50 rounded border border-white/10">
                            <h4 className="font-semibold mb-2">How to Fix (Cloud Run / Firebase):</h4>
                            <p className="text-sm text-gray-400">Add these Environment Variables to your container configuration:</p>
                            <ul className="text-xs font-mono mt-2 space-y-1 text-green-400">
                                <li>QDRANT_URL=https://your-qdrant-instance.com</li>
                                <li>EMBEDDINGS_BASE_URL=https://your-embedding-service.com</li>
                            </ul>
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return <>{children}</>;
}
