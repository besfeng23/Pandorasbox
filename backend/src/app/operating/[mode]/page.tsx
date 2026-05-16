import { notFound, redirect } from 'next/navigation';
import { AppLayout } from '@/components/dashboard/app-layout';
import { OperatingCommandCenter, isOperatingMode } from '@/components/operating-command-center';

export default async function OperatingModulePage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;

  if (mode === 'command-center') {
    redirect('/');
  }

  if (!isOperatingMode(mode)) {
    notFound();
  }

  return (
    <AppLayout>
      <OperatingCommandCenter mode={mode} />
    </AppLayout>
  );
}
