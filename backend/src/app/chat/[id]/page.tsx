
'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/dashboard/app-layout';
import { useUser } from '@/firebase';
import { ChatPanel } from '@/components/chat/chat-panel';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout threadId={id}>
      <ErrorBoundary>
        <ChatPanel threadId={id} />
      </ErrorBoundary>
    </AppLayout>
  );
}
