import { OperatingAppLayoutV2 } from '@/components/operating-app-layout-v2';
import { OperatingCommandCenter, isOperatingMode } from '@/components/operating-command-center';

export default async function OperatingModulePage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  const safeMode = isOperatingMode(mode) && mode !== 'command-center' ? mode : 'command-center';

  return (
    <OperatingAppLayoutV2>
      <OperatingCommandCenter mode={safeMode} />
    </OperatingAppLayoutV2>
  );
}
