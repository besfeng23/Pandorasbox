import { OperatingAppLayoutV2 } from '@/components/operating-app-layout-v2';
import { OperatingCommandCenter } from '@/components/operating-command-center';

const modes = [
  'command-center',
  'today',
  'ai-chief-of-staff',
  'raw-movement-inbox',
  'priority-lock',
  'parked-projects',
  'authority-matrix',
  'proof-vault',
  'claims-vault',
  'deal-control-sheets',
  'decision-gates',
  'repair-queue',
  'weekly-scoreboard',
  'contacts',
  'companies',
  'pipeline',
  'clients',
  'tasks',
  'life-import',
  'business-map',
  'pattern-analysis',
  'operating-rules',
] as const;

type RouteMode = (typeof modes)[number];

function toRouteMode(value: string): RouteMode {
  return modes.includes(value as RouteMode) && value !== 'command-center' ? (value as RouteMode) : 'command-center';
}

export default async function OperatingModulePage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;

  return (
    <OperatingAppLayoutV2>
      <OperatingCommandCenter mode={toRouteMode(mode)} />
    </OperatingAppLayoutV2>
  );
}
