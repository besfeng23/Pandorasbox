#!/usr/bin/env tsx
/**
 * Send test events to Kairos Event Gateway
 * 
 * Usage:
 *   # Send to local dev server (default)
 *   tsx scripts/send-test-event.ts
 *   
 *   # Send to deployed service
 *   GATEWAY_URL=https://kairos-event-gateway-xxx.run.app tsx scripts/send-test-event.ts
 *   
 *   # Send with IAM auth (for deployed service)
 *   USE_IAM_AUTH=true GATEWAY_URL=https://kairos-event-gateway-xxx.run.app tsx scripts/send-test-event.ts
 */

import { GoogleAuth } from 'google-auth-library';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const USE_IAM_AUTH = process.env.USE_IAM_AUTH === 'true';

interface TestEvent {
  dedupeKey: string;
  source: string;
  action: string;
  status: string;
  severity?: string;
  module?: string;
  actor?: string;
  refType?: string;
  refId?: string;
  link?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

async function getAuthToken(): Promise<string | undefined> {
  if (!USE_IAM_AUTH) {
    return undefined;
  }

  // Try using gcloud CLI first (simpler, doesn't require application-default credentials)
  try {
    const { execSync } = await import('child_process');
    const token = execSync(`gcloud auth print-identity-token --audience=${GATEWAY_URL}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    
    if (token && !token.includes('ERROR')) {
      return token;
    }
  } catch (error: any) {
    // Fall back to google-auth-library
    console.log('💡 gcloud CLI token failed, trying google-auth-library...');
  }

  // Fallback to google-auth-library
  try {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(GATEWAY_URL);
    const headers = await client.getRequestHeaders();
    return headers.Authorization?.replace('Bearer ', '');
  } catch (error: any) {
    console.error('❌ Failed to get IAM auth token:', error.message);
    console.error('');
    console.error('💡 Authentication options:');
    console.error('   1. Use gcloud CLI: gcloud auth login');
    console.error('   2. Use application-default: gcloud auth application-default login');
    console.error('   3. Test locally without auth: npm run test:event (without USE_IAM_AUTH)');
    process.exit(1);
  }
}

async function sendTestEvent(event: TestEvent) {
  const token = await getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`📨 Sending test event to ${GATEWAY_URL}/v1/event`);
  console.log(`   Event:`, JSON.stringify(event, null, 2));
  console.log('');

  try {
    const response = await fetch(`${GATEWAY_URL}/v1/event`, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
    });

    const responseText = await response.text();
    let responseBody: any;
    
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    if (response.ok) {
      console.log('✅ Event sent successfully!');
      console.log(`   Response:`, JSON.stringify(responseBody, null, 2));
      return true;
    } else {
      console.error(`❌ Failed to send event (HTTP ${response.status})`);
      console.error(`   Response:`, JSON.stringify(responseBody, null, 2));
      
      if (response.status === 401 || response.status === 403) {
        console.error('');
        console.error('💡 Authentication required. Use IAM auth:');
        console.error('   USE_IAM_AUTH=true GATEWAY_URL=<url> tsx scripts/send-test-event.ts');
      } else if (response.status === 502) {
        console.error('');
        console.error('💡 Gateway received request but Base44 ingest failed');
        console.error('   Check Base44 ingest endpoint and secret configuration');
      }
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error sending event:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('💡 Connection refused. Is the gateway running?');
      console.error('   Local dev: cd services/kairos-event-gateway && npm run dev');
    }
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const eventType = args[0] || 'simple';

  console.log('🧪 Kairos Event Gateway - Test Event Sender');
  console.log(`📍 Gateway URL: ${GATEWAY_URL}`);
  console.log(`🔐 IAM Auth: ${USE_IAM_AUTH ? 'Yes' : 'No'}`);
  console.log('');

  const events: Record<string, TestEvent> = {
    simple: {
      dedupeKey: `test:event:${Date.now()}`,
      source: 'test',
      action: 'test.event',
      status: 'ok',
      severity: 'low',
      module: 'testing',
    },
    github: {
      dedupeKey: `test:github:pr:123:opened:${Date.now()}`,
      source: 'github',
      actor: 'octocat',
      module: 'code',
      action: 'pr.opened',
      status: 'ok',
      severity: 'low',
      refType: 'pr',
      refId: '123',
      link: 'https://github.com/org/repo/pull/123',
      tags: ['feature', 'ui'],
      metadata: {
        repo: 'test-repo',
        author: 'octocat',
        title: 'Test PR',
      },
    },
    linear: {
      dedupeKey: `test:linear:issue:456:created:${Date.now()}`,
      source: 'linear',
      actor: 'user@example.com',
      module: 'project',
      action: 'issue.created',
      status: 'ok',
      severity: 'medium',
      refType: 'issue',
      refId: '456',
      link: 'https://linear.app/org/issue/456',
      tags: ['bug', 'urgent'],
      metadata: {
        team: 'Engineering',
        priority: 'High',
      },
    },
    firebase: {
      dedupeKey: `test:firebase:deploy:789:success:${Date.now()}`,
      source: 'firebase',
      actor: 'system',
      module: 'deployment',
      action: 'deploy.success',
      status: 'ok',
      severity: 'low',
      refType: 'deployment',
      refId: '789',
      metadata: {
        project: 'test-project',
        service: 'functions',
      },
    },
  };

  const event = events[eventType];
  if (!event) {
    console.error(`❌ Unknown event type: ${eventType}`);
    console.error(`   Available types: ${Object.keys(events).join(', ')}`);
    process.exit(1);
  }

  const success = await sendTestEvent(event);
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

