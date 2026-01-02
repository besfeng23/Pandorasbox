
'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { PandorasBox } from '@/components/pandoras-box';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <AuthGuard>
      <PandorasBox user={user!} />
    </AuthGuard>
  );
}
