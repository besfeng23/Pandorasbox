'use client';

import { use } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { ChatContainer } from '@/components/chat/ChatContainer';

export const dynamic = 'force-dynamic';

export default function ChatConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <AppLayout conversationId={id}>
      <div className="flex h-full flex-col">
        <ChatContainer initialConversationId={id} />
      </div>
    </AppLayout>
  );
}
