/**
 * Send Test Stabilization Kairos Event
 * 
 * Sends event to Kairos indicating completion of test stabilization.
 * Uses deep_research_step_completed event type for Deep Research plan tracking.
 */

import { GoogleAuth } from 'google-auth-library';

const GATEWAY_URL = process.env.KAIROS_EVENT_GATEWAY_URL || 'https://kairos-event-gateway-axypi7xsha-as.a.run.app';
const GOOGLE_ID_TOKEN = process.env.GOOGLE_ID_TOKEN;

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

async function sendEvent(event: any, token?: string): Promise<boolean> {
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
      console.error(`❌ Failed to send event (HTTP ${response.status}): ${text}`);
      return false;
    }
    return true;
  } catch (error: any) {
    console.error(`❌ Error sending event: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('✅ Sending Test Stabilization Kairos Event');
  console.log('');

  const eventTime = new Date().toISOString();
  const event = {
    event_time: eventTime,
    event_type: 'deep_research_step_completed',
    actor: 'system',
    source: 'deep_research',
    node_id: 'PB-OPS-TEST-002',
    confidence: 0.95,
    payload: {
      step: 'stabilize_tests',
      result: 'all_green',
      tests: '10 suites, 58 tests passing',
      fix: 'Fixed cron-routes test isolation by resetting getFirestoreAdmin mock between tests; updated Jest config to .cjs with explicit Babel transforms',
      files_changed: ['jest.config.cjs', 'babel.config.cjs', 'tests/api/cron-routes.test.ts'],
      outcome: 'pass',
      notes: 'All 58 tests passing. Fixed cron-routes test flakiness by properly resetting mocks in beforeEach. Updated Jest config to use .cjs extension and explicit Babel transforms for proper TypeScript/ESM handling.',
    },
  };

  const token = await getAuthToken();
  if (!token) {
    console.warn('⚠️  Could not get auth token, but continuing...');
  }

  const success = await sendEvent(event, token);

  if (success) {
    console.log('✅ Test stabilization event sent successfully');
  } else {
    console.error('❌ Failed to send test stabilization event');
    process.exit(1);
  }

  console.log('');
  console.log('📊 Check Kairos dashboard: https://kairostrack.base44.app');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

