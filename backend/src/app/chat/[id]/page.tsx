
'use client';

import { useEffect, use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/dashboard/app-layout';
import { useAuth } from '@/context/AuthContext';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { getThread } from '@/app/actions';

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading: loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Determine agentId from thread
  const [agentId, setAgentId] = useState<'builder' | 'universe'>('universe');

  useEffect(() => {
    if (user && id) {
      getThread(id, user.uid).then((thread) => {
        if (thread?.agent) {
          setAgentId(thread.agent as 'builder' | 'universe');
        }
      });
    }
  }, [user, id]);

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
        <div className="flex h-full flex-col">
          <ChatWindow threadId={id} agentId={agentId} />
        </div>
      </ErrorBoundary>
    </AppLayout>
  );
}
