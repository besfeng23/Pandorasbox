'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/dashboard/app-layout';
import { useAuthContext } from '@/lib/auth/AuthContext';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';

/**
 * Main chat page for new conversations
 * Redirects to /login if user is not authenticated
 */
export default function ChatPage() {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();

  // Authentication Guard: Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Show loading spinner while checking auth
  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <ErrorBoundary>
        <div className="flex h-full flex-col">
          <ChatContainer />
        </div>
      </ErrorBoundary>
    </AppLayout>
  );
}

