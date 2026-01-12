/* eslint-disable no-console */
/**
 * Initialize Kairos Master Plan
 * 
 * Sends the complete master plan to Base44 Kairos so it can aggregate events
 * into completion percentages and module tracking.
 */

import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

const GATEWAY_URL = process.env.KAIROS_EVENT_GATEWAY_URL || 'https://kairos-event-gateway-axypi7xsha-as.a.run.app';
const REPO_ROOT = process.cwd();
const INTAKE_DIR = path.join(REPO_ROOT, '.kairos', 'intake');

const UIUX_SPEC_PATH = path.join(INTAKE_DIR, 'pandora-uiux-spec-items.json');
const AUDIT_ISSUES_PATH = path.join(INTAKE_DIR, 'kairos-audit-issues.json');
const ELITE_REDESIGN_PATH = path.join(INTAKE_DIR, 'elite-redesign-items.json');

async function readJson<T>(p: string): Promise<T | null> {
  if (!fs.existsSync(p)) return null;
  try {
    const text = fs.readFileSync(p, 'utf-8');
    return JSON.parse(text) as T;
  } catch (error: any) {
    console.error(`❌ Failed to read ${path.relative(REPO_ROOT, p)}: ${error.message}`);
    return null;
  }
}

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
      console.error(`❌ Failed (${response.status}): ${text.slice(0, 200)}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('📋 Initializing Kairos Master Plan');
  console.log(`📍 Gateway: ${GATEWAY_URL}`);
  console.log('');

  // Read all spec items
  const uiuxSpecItems = await readJson<any[]>(UIUX_SPEC_PATH);
  const auditIssues = await readJson<any[]>(AUDIT_ISSUES_PATH);
  const eliteRedesignItems = await readJson<any[]>(ELITE_REDESIGN_PATH);

  if (!uiuxSpecItems && !auditIssues && !eliteRedesignItems) {
    console.error('❌ No intake files found');
    process.exit(1);
  }

  const allItems = [
    ...(uiuxSpecItems || []),
    ...(eliteRedesignItems || []),
    ...(auditIssues || []),
  ];

  console.log(`📊 Found ${allItems.length} plan items:`);
  console.log(`   UI/UX: ${uiuxSpecItems?.length || 0}`);
  console.log(`   Elite: ${eliteRedesignItems?.length || 0}`);
  console.log(`   Audit: ${auditIssues?.length || 0}`);
  console.log('');

  const token = await getAuthToken();
  console.log('✅ Authenticated');
  console.log('');

  // Send plan initialization event
  const planEvent = {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    dedupeKey: `plan:initialize:${Date.now()}`,
    source: 'planning',
    action: 'plan.initialize',
    status: 'ok',
    severity: 'low',
    module: 'system',
    refType: 'master_plan',
    refId: 'pandora-uiux-plan',
    tags: ['plan', 'initialize', 'master-plan'],
    metadata: {
      title: 'Pandora UI/UX Master Plan',
      version: '1.0.0',
      totalItems: allItems.length,
      items: allItems.map(item => ({
        slug: item.slug,
        title: item.title,
        module: item.module,
        status: item.status,
        priority: item.priority,
        severity: item.severity,
        dedupeKey: item.dedupeKey,
        phaseIds: item.phaseIds || [],
        whereInCode: item.whereInCode || [],
        acceptanceCriteria: item.acceptanceCriteria || [],
        checklist: item.checklist || [],
      })),
      modules: [...new Set(allItems.map(i => i.module).filter(Boolean))],
      summary: {
        byStatus: {
          done: allItems.filter(i => i.status === 'done').length,
          'in-progress': allItems.filter(i => i.status === 'in-progress').length,
          backlog: allItems.filter(i => i.status === 'backlog').length,
        },
        byPriority: {
          high: allItems.filter(i => i.priority === 'high').length,
          medium: allItems.filter(i => i.priority === 'medium' || i.priority === 'med').length,
          low: allItems.filter(i => i.priority === 'low').length,
        },
      },
    },
  };

  console.log('📤 Sending master plan initialization...');
  const success = await sendEvent(planEvent, token);
  
  if (success) {
    console.log('✅ Master plan initialized!');
    console.log('');
    console.log('📊 The dashboard should now:');
    console.log('   - Show completion percentages');
    console.log('   - Track modules');
    console.log('   - Aggregate events into progress');
    console.log('');
    console.log('💡 Refresh the dashboard: https://kairostrack.base44.app');
  } else {
    console.log('❌ Failed to initialize plan');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});

