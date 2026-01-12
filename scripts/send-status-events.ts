/* eslint-disable no-console */
/**
 * Send Status Change Events to Kairos
 */

import { GoogleAuth } from 'google-auth-library';

const GATEWAY_URL = process.env.KAIROS_EVENT_GATEWAY_URL || 'https://kairos-event-gateway-axypi7xsha-as.a.run.app';

const STATUS_CHANGES = [
  { component: 'command-menu', from: 'in-progress', to: 'done', message: 'Command menu completed with keyboard shortcuts' },
  { component: 'theme-system', from: 'in-progress', to: 'done', message: 'Premium dark theme system implemented' },
  { component: 'chat-page', from: 'backlog', to: 'in-progress', message: 'Started implementing chat page UI' },
  { component: 'message-list', from: 'backlog', to: 'in-progress', message: 'Message list component in development' },
  { component: 'floating-composer', from: 'backlog', to: 'in-progress', message: 'Floating composer started' },
  { component: 'pandora-ui-dashboard', from: 'backlog', to: 'in-progress', message: 'Dashboard implementation begun' },
];

async function getAuthToken(): Promise<string> {
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(GATEWAY_URL);
  const headers = await client.getRequestHeaders();
  return headers.Authorization?.replace('Bearer ', '') || '';
}

async function sendEvent(event: any, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${GATEWAY_URL}/v1/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(event),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔄 Sending Status Change Events');
  console.log('');

  const token = await getAuthToken();
  let successCount = 0;

  for (const change of STATUS_CHANGES) {
    const event = {
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      dedupeKey: `status:change:${change.component}:${Date.now()}`,
      source: 'uiux',
      action: 'status.change',
      status: change.to === 'done' ? 'ok' : 'in-progress',
      severity: change.to === 'done' ? 'low' : 'medium',
      module: 'frontend',
      refType: 'ui_component',
      refId: change.component,
      tags: ['uiux', 'status-change', `from:${change.from}`, `to:${change.to}`],
      metadata: {
        component: change.component,
        fromStatus: change.from,
        toStatus: change.to,
        message: change.message,
        timestamp: new Date().toISOString(),
      },
    };

    process.stdout.write(`   ${change.component}: ${change.from} → ${change.to}... `);
    if (await sendEvent(event, token)) {
      successCount++;
      console.log('✅');
    } else {
      console.log('❌');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('');
  console.log(`✅ Sent ${successCount}/${STATUS_CHANGES.length} status change events`);
}

main().catch(console.error);

