'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { OperatingAppLayoutV2 } from '@/components/operating-app-layout-v2';
import { OperatingCommandCenter } from '@/components/operating-command-center';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  if (userLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <OperatingAppLayoutV2>
      <OperatingCommandCenter mode="command-center" />
    </OperatingAppLayoutV2>
  );
}
