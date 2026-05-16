import { OperatingAppLayout } from '@/components/operating-app-layout';
import { OperatingCommandCenter, isOperatingMode } from '@/components/operating-command-center';

export default async function OperatingModulePage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  const safeMode = isOperatingMode(mode) && mode !== 'command-center' ? mode : 'command-center';

  return (
    <OperatingAppLayout>
      <OperatingCommandCenter mode={safeMode} />
    </OperatingAppLayout>
  );
}
