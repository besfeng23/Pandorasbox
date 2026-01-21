'use client';

import React from 'react';
import { MemoryTable } from '@/components/settings/memory-table';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function MemoryPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        Please log in to view your memories.
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Your Memories</h1>
      <p className="text-muted-foreground">Manage and review your stored AI memories.</p>
      <MemoryTable userId={user.uid} />
    </div>
  );
}
