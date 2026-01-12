/* eslint-disable no-console */
/**
 * Send Progress Tracking Events to Kairos
 * 
 * Sends UI/UX progress events with visible sources and actions
 */

import { GoogleAuth } from 'google-auth-library';

const GATEWAY_URL = process.env.KAIROS_EVENT_GATEWAY_URL || 'https://kairos-event-gateway-axypi7xsha-as.a.run.app';

const UIUX_ITEMS = [
  { slug: 'app-shell-layout', title: 'App Shell Layout', module: 'frontend', status: 'backlog', priority: 'high' },
  { slug: 'thread-sidebar', title: 'Thread Sidebar', module: 'frontend', status: 'backlog', priority: 'high' },
  { slug: 'topbar', title: 'Topbar', module: 'frontend', status: 'backlog', priority: 'high' },
  { slug: 'chat-page', title: 'Chat Page', module: 'frontend', status: 'in-progress', priority: 'high' },
  { slug: 'message-list', title: 'Message List', module: 'frontend', status: 'in-progress', priority: 'high' },
  { slug: 'message-card', title: 'Message Card', module: 'frontend', status: 'in-progress', priority: 'medium' },
  { slug: 'floating-composer', title: 'Floating Composer', module: 'frontend', status: 'in-progress', priority: 'high' },
  { slug: 'command-menu', title: 'Command Menu', module: 'frontend', status: 'done', priority: 'high' },
  { slug: 'theme-system', title: 'Theme System', module: 'frontend', status: 'done', priority: 'high' },
  { slug: 'inspector-drawer', title: 'Inspector Drawer', module: 'frontend', status: 'backlog', priority: 'medium' },
  { slug: 'artifacts-page', title: 'Artifacts Page', module: 'frontend', status: 'backlog', priority: 'medium' },
  { slug: 'artifact-viewer', title: 'Artifact Viewer', module: 'frontend', status: 'backlog', priority: 'medium' },
  { slug: 'graph-page', title: 'Graph Page', module: 'frontend', status: 'backlog', priority: 'low' },
  { slug: 'knowledge-base-page', title: 'Knowledge Base Page', module: 'frontend', status: 'backlog', priority: 'low' },
  { slug: 'memories-page', title: 'Memories Page', module: 'frontend', status: 'backlog', priority: 'low' },
  { slug: 'settings-page', title: 'Settings Page', module: 'frontend', status: 'backlog', priority: 'low' },
  { slug: 'pandora-ui-dashboard', title: 'Pandora UI Dashboard', module: 'frontend', status: 'in-progress', priority: 'high' },
];

async function getAuthToken(): Promise<string> {
  try {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(GATEWAY_URL);
    const headers = await client.getRequestHeaders();
    return headers.Authorization?.replace('Bearer ', '') || '';
  } catch (error: any) {
    console.error('❌ Failed to get auth token:', error.message);
    throw error;
  }
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

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(`❌ Failed (${response.status}): ${event.dedupeKey}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Sending UI/UX Progress Events to Kairos');
  console.log(`📍 Gateway: ${GATEWAY_URL}`);
  console.log('');

  const token = await getAuthToken();
  console.log('✅ Authenticated');
  console.log('');

  let successCount = 0;
  let failCount = 0;

  // Send status update events for each item
  for (const item of UIUX_ITEMS) {
    const timestamp = new Date().toISOString();
    
    // Create progress update event
    const event = {
      schemaVersion: 1,
      timestamp,
      dedupeKey: `uiux:progress:${item.slug}:${Date.now()}`,
      source: 'uiux',
      action: 'progress.update',
      status: item.status === 'done' ? 'ok' : item.status === 'in-progress' ? 'in-progress' : 'pending',
      severity: item.priority === 'high' ? 'high' : item.priority === 'medium' ? 'medium' : 'low',
      module: item.module,
      refType: 'ui_component',
      refId: item.slug,
      tags: ['uiux', 'progress', `module:${item.module}`, `status:${item.status}`, `priority:${item.priority}`],
      metadata: {
        title: item.title,
        component: item.slug,
        status: item.status,
        priority: item.priority,
        module: item.module,
        progress: item.status === 'done' ? 100 : item.status === 'in-progress' ? 50 : 0,
      },
    };

    process.stdout.write(`   ${item.slug} (${item.status})... `);
    const success = await sendEvent(event, token);
    if (success) {
      successCount++;
      console.log('✅');
    } else {
      failCount++;
      console.log('❌');
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Send overall progress summary
  const doneCount = UIUX_ITEMS.filter(i => i.status === 'done').length;
  const inProgressCount = UIUX_ITEMS.filter(i => i.status === 'in-progress').length;
  const totalCount = UIUX_ITEMS.length;
  const overallProgress = Math.round((doneCount / totalCount) * 100);

  const summaryEvent = {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    dedupeKey: `uiux:summary:${Date.now()}`,
    source: 'uiux',
    action: 'summary.update',
    status: 'ok',
    severity: 'low',
    module: 'frontend',
    refType: 'summary',
    refId: 'uiux-overall',
    tags: ['uiux', 'summary', 'progress'],
    metadata: {
      title: 'UI/UX Overall Progress',
      total: totalCount,
      done: doneCount,
      inProgress: inProgressCount,
      backlog: totalCount - doneCount - inProgressCount,
      percentComplete: overallProgress,
    },
  };

  process.stdout.write(`   Overall progress (${overallProgress}%)... `);
  const summarySuccess = await sendEvent(summaryEvent, token);
  if (summarySuccess) {
    successCount++;
    console.log('✅');
  } else {
    failCount++;
    console.log('❌');
  }

  console.log('');
  if (failCount === 0) {
    console.log(`✅ All ${successCount} events sent successfully!`);
    console.log('');
    console.log('📊 Check dashboard: https://kairostrack.base44.app');
  } else {
    console.log(`⚠️  Sent ${successCount}, failed ${failCount}`);
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});

