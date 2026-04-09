'use client';

import { AppLayout } from '@/components/dashboard/app-layout';
import { ChatContainer } from '@/components/chat/ChatContainer';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        <ChatContainer />
      </div>
    </AppLayout>
  );
}
