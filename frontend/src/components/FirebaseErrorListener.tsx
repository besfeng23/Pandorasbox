'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // This will be caught by Next.js's error boundary and displayed in the dev overlay
      // We throw the error to make it visible for debugging.
      toast({
        variant: 'destructive',
        title: 'Firestore Permission Error',
        description: 'An operation was denied by your security rules. See dev overlay for details.',
      });
      throw error;
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
