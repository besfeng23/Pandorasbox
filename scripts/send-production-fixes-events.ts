import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';

const GATEWAY_URL = process.env.KAIROS_EVENT_GATEWAY_URL || 'https://kairos-event-gateway-axypi7xsha-as.a.run.app';
const GOOGLE_ID_TOKEN = process.env.GOOGLE_ID_TOKEN;

type EventPayload = {
  schemaVersion: number;
  timestamp: string;
  dedupeKey: string;
  source: string;
  action: string;
  status: string;
  module?: string;
  severity?: string;
  refType: string;
  refId: string;
  tags?: string[];
  metadata: Record<string, any>;
};

async function getAuthToken(): Promise<string | undefined> {
  if (GOOGLE_ID_TOKEN) {
    return GOOGLE_ID_TOKEN;
  }

  try {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(GATEWAY_URL);
    const headers = await client.getRequestHeaders();
    return headers.Authorization?.replace('Bearer ', '') || undefined;
  } catch (error: any) {
    console.error(`❌ Failed to get identity token: ${error.message}`);
    return undefined;
  }
}

async function sendEvent(event: EventPayload, token?: string): Promise<boolean> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${GATEWAY_URL}/v1/event`, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(`❌ Failed to send event (HTTP ${response.status}): ${event.dedupeKey} - ${text}`);
      return false;
    }
    return true;
  } catch (error: any) {
    console.error(`❌ Error sending event ${event.dedupeKey}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Sending Production Readiness Fixes to Kairos');
  console.log(`📍 Gateway: ${GATEWAY_URL}`);
  console.log('');

  const token = await getAuthToken();
  if (!token) {
    console.error('❌ Authentication failed. Please ensure you are logged in to gcloud or provide GOOGLE_ID_TOKEN.');
    process.exit(1);
  }
  console.log('✅ Authenticated');
  console.log('');

  const timestamp = new Date().toISOString();

  const fixes = [
    {
      id: 'chat-bug-fix',
      title: 'Fixed Critical Chat Bug',
      description: 'Messages stuck on "Thinking..." - Added comprehensive error handling, timeout detection, and user-facing error messages',
      status: 'done',
      module: 'backend',
      files: ['src/app/actions/chat.ts', 'src/app/(pandora-ui)/components/ChatMessages.tsx'],
    },
    {
      id: 'thread-title-generation',
      title: 'Improved Thread Title Generation',
      description: 'Better auto-title extraction (first sentence up to 50 chars), improved fallbacks for voice/image messages',
      status: 'done',
      module: 'backend',
      files: ['src/app/actions/chat.ts'],
    },
    {
      id: 'message-ui-enhancement',
      title: 'Enhanced Message UI',
      description: 'Improved avatar styling with neon gradient borders, better message bubbles, clear role differentiation, timestamps, markdown support',
      status: 'done',
      module: 'frontend',
      files: ['src/app/(pandora-ui)/components/ChatMessages.tsx'],
    },
    {
      id: 'input-bar-enhancement',
      title: 'Enhanced Input Bar',
      description: 'Better elevation with shadow effects, improved hover states, tooltips, neon accent styling',
      status: 'done',
      module: 'frontend',
      files: ['src/app/(pandora-ui)/page.tsx'],
    },
    {
      id: 'brand-styling-integration',
      title: 'Integrated Brand Styling',
      description: 'Added starry background effect, enhanced gradient borders, circuit textures, neon glow effects throughout',
      status: 'done',
      module: 'frontend',
      files: ['src/app/globals.css'],
    },
    {
      id: 'command-menu-styling',
      title: 'Enhanced Command Menu Styling',
      description: 'Improved command palette with brand-consistent glass panels and neon accents',
      status: 'done',
      module: 'frontend',
      files: ['src/components/command-menu.tsx'],
    },
    {
      id: 'thread-management-improvements',
      title: 'Thread Management Improvements',
      description: 'Added title tooltips, improved thread list display',
      status: 'done',
      module: 'frontend',
      files: ['src/app/(pandora-ui)/components/Sidebar.tsx'],
    },
  ];

  let successCount = 0;

  for (const fix of fixes) {
    const event: EventPayload = {
      schemaVersion: 1,
      timestamp,
      dedupeKey: `production-fix:${fix.id}`,
      source: 'production',
      action: 'fix.completed',
      status: fix.status,
      module: fix.module,
      refType: 'fix',
      refId: fix.id,
      tags: ['production-readiness', 'bug-fix', `module:${fix.module}`, `status:${fix.status}`],
      metadata: {
        title: fix.title,
        description: fix.description,
        files: fix.files,
        completedAt: timestamp,
      },
    };
    process.stdout.write(`   ${fix.id}... `);
    if (await sendEvent(event, token)) {
      successCount++;
      console.log('✅');
    } else {
      console.log('❌');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Send overall production readiness event
  const overallEvent: EventPayload = {
    schemaVersion: 1,
    timestamp,
    dedupeKey: 'production-readiness:audit-complete',
    source: 'production',
    action: 'audit.completed',
    status: 'done',
    module: 'system',
    refType: 'project',
    refId: 'pandora-ui',
    tags: ['production-readiness', 'audit', 'complete'],
    metadata: {
      title: 'Production Readiness Audit Complete',
      fixesCompleted: fixes.length,
      fixes: fixes.map(f => ({ id: f.id, title: f.title })),
      percentComplete: 100,
    },
  };
  process.stdout.write(`   Overall production readiness... `);
  if (await sendEvent(overallEvent, token)) {
    successCount++;
    console.log('✅');
  } else {
    console.log('❌');
  }

  console.log('');
  if (successCount === fixes.length + 1) {
    console.log(`✅ All ${successCount} events sent successfully!`);
  } else {
    console.error(`⚠️  Sent ${successCount} events, ${fixes.length + 1 - successCount} failed.`);
    process.exit(1);
  }

  console.log('');
  console.log('📊 Check dashboard: https://kairostrack.base44.app');
}

main().catch(console.error);

