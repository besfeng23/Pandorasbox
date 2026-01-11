/* eslint-disable no-console */
/**
 * Kairos Intake → Event Gateway (idempotent)
 *
 * Reads intake JSON files (.kairos/intake/*.json) and emits events to Kairos Event Gateway.
 *
 * Creates/updates:
 * - Spec items from pandora-uiux-spec-items.json
 * - Audit issues from kairos-audit-issues.json
 *
 * Idempotency:
 * - Uses dedupeKey in event payload (stable, deterministic)
 * - Deterministic ordering and stable JSON stringify
 *
 * Env:
 * - KAIROS_EVENT_GATEWAY_URL (required; e.g., https://kairos-event-gateway-xxx.run.app)
 * - GOOGLE_ID_TOKEN (optional; pre-minted identity token for local runs)
 *
 * Usage:
 *   # Use pre-minted token
 *   GOOGLE_ID_TOKEN=$(gcloud auth print-identity-token) KAIROS_EVENT_GATEWAY_URL=... npm run kairos:intake
 *
 *   # Or let script instruct user to get token
 *   KAIROS_EVENT_GATEWAY_URL=... npm run kairos:intake
 *
 * Run:
 *   npm run kairos:intake
 */

import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

const REPO_ROOT = process.cwd();
const INTAKE_DIR = path.join(REPO_ROOT, '.kairos', 'intake');
const UIUX_SPEC_PATH = path.join(INTAKE_DIR, 'pandora-uiux-spec-items.json');
const AUDIT_ISSUES_PATH = path.join(INTAKE_DIR, 'kairos-audit-issues.json');
const ELITE_REDESIGN_PATH = path.join(INTAKE_DIR, 'elite-redesign-items.json');

const GATEWAY_URL = process.env.KAIROS_EVENT_GATEWAY_URL;
const GOOGLE_ID_TOKEN = process.env.GOOGLE_ID_TOKEN;

type SpecItem = {
  schemaVersion: number;
  slug: string;
  title: string;
  module: string;
  phaseIds: number[];
  whereInCode: string[];
  acceptanceCriteria: string[];
  checklist: string[];
  dedupeKey: string;
  priority: 'low' | 'med' | 'medium' | 'high';
  status: string;
  severity?: 'blocker' | 'high' | 'medium' | 'low';
  evidence?: string;
  epic?: string;
};

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

async function getAuthToken(): Promise<string | undefined> {
  if (GOOGLE_ID_TOKEN) {
    return GOOGLE_ID_TOKEN;
  }

  if (!GATEWAY_URL) {
    return undefined;
  }

  try {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(GATEWAY_URL);
    const token = await client.getAccessToken();
    return token.token || undefined;
  } catch (error: any) {
    console.error(`❌ Failed to get identity token: ${error.message}`);
    console.error('');
    console.error('💡 To get an identity token, run:');
    console.error(`   gcloud auth print-identity-token --audience=${GATEWAY_URL}`);
    console.error('');
    console.error('   Or set GOOGLE_ID_TOKEN environment variable with a pre-minted token.');
    return undefined;
  }
}

function normalizePriority(priority: string): string {
  if (priority === 'med') return 'medium';
  return priority;
}

function normalizeSeverity(severity?: string): string | undefined {
  if (!severity) return undefined;
  const map: Record<string, string> = {
    blocker: 'high',
    high: 'high',
    medium: 'medium',
    low: 'low',
  };
  return map[severity.toLowerCase()] || 'medium';
}

function specItemToEvent(item: SpecItem, source: 'uiux' | 'audit'): EventPayload {
  const timestamp = new Date().toISOString();
  const metadata: Record<string, any> = {
    title: item.title,
    module: item.module,
    priority: normalizePriority(item.priority),
    status: item.status,
  };

  if (item.whereInCode && Array.isArray(item.whereInCode) && item.whereInCode.length > 0) {
    metadata.whereInCode = item.whereInCode;
  }
  if (item.acceptanceCriteria && Array.isArray(item.acceptanceCriteria) && item.acceptanceCriteria.length > 0) {
    metadata.acceptanceCriteria = item.acceptanceCriteria;
  }
  if (item.checklist && Array.isArray(item.checklist) && item.checklist.length > 0) {
    metadata.checklist = item.checklist;
  }
  if (item.phaseIds && Array.isArray(item.phaseIds) && item.phaseIds.length > 0) {
    metadata.phaseIds = item.phaseIds;
  }
  if (item.epic) {
    metadata.epic = item.epic;
  }
  if (item.evidence) {
    metadata.evidence = item.evidence;
  }

  const tags: string[] = ['pb-kairos', 'intake'];
  if (source === 'uiux') {
    tags.push('uiux', `module:${item.module}`);
  } else {
    tags.push('audit');
    if (item.severity) {
      tags.push(`severity:${normalizeSeverity(item.severity)}`);
    }
    if (item.epic) {
      tags.push(`epic:${item.epic}`);
    }
  }

  return {
    schemaVersion: item.schemaVersion || 1,
    timestamp,
    dedupeKey: item.dedupeKey,
    source: 'planning',
    action: 'specitem.upsert',
    status: 'ok',
    module: item.module,
    severity: normalizeSeverity(item.severity) || normalizeSeverity(item.priority),
    refType: 'spec_item',
    refId: item.slug,
    tags,
    metadata,
  };
}

async function sendEvent(event: EventPayload, token?: string): Promise<boolean> {
  if (!GATEWAY_URL) {
    console.error('❌ KAIROS_EVENT_GATEWAY_URL not set');
    return false;
  }

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
      console.error(`❌ Failed to send event (HTTP ${response.status}): ${event.dedupeKey}`);
      if (response.status === 401 || response.status === 403) {
        console.error('   Authentication required. Set GOOGLE_ID_TOKEN or ensure IAM access.');
      }
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`❌ Error sending event ${event.dedupeKey}: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused. Is the gateway running?');
    }
    return false;
  }
}

async function main() {
  console.log('📥 Kairos Intake → Event Gateway');
  console.log('');

  if (!GATEWAY_URL) {
    console.error('❌ KAIROS_EVENT_GATEWAY_URL environment variable is required');
    console.error('');
    console.error('   Example:');
    console.error('     KAIROS_EVENT_GATEWAY_URL=https://kairos-event-gateway-xxx.run.app npm run kairos:intake');
    process.exit(1);
  }

  console.log(`📍 Gateway URL: ${GATEWAY_URL}`);
  console.log('');

  // Read intake files
  const uiuxSpecItems = await readJson<SpecItem[]>(UIUX_SPEC_PATH);
  const auditIssues = await readJson<SpecItem[]>(AUDIT_ISSUES_PATH);
  const eliteRedesignItems = await readJson<SpecItem[]>(ELITE_REDESIGN_PATH);

  if (!uiuxSpecItems && !auditIssues && !eliteRedesignItems) {
    console.error('❌ No intake files found');
    console.error(`   Expected: ${path.relative(REPO_ROOT, UIUX_SPEC_PATH)}`);
    console.error(`   Expected: ${path.relative(REPO_ROOT, AUDIT_ISSUES_PATH)}`);
    console.error(`   Expected: ${path.relative(REPO_ROOT, ELITE_REDESIGN_PATH)}`);
    process.exit(1);
  }

  // Get auth token
  const token = await getAuthToken();
  if (!token) {
    console.error('❌ Authentication required');
    console.error('');
    console.error('💡 Get an identity token:');
    console.error(`   gcloud auth print-identity-token --audience=${GATEWAY_URL}`);
    console.error('');
    console.error('   Then run with:');
    console.error(`   GOOGLE_ID_TOKEN=<token> KAIROS_EVENT_GATEWAY_URL=${GATEWAY_URL} npm run kairos:intake`);
    process.exit(1);
  }

  // Convert to events (deterministic ordering)
  const events: EventPayload[] = [];

  if (uiuxSpecItems && Array.isArray(uiuxSpecItems)) {
    for (const item of uiuxSpecItems.slice().sort((a, b) => a.slug.localeCompare(b.slug))) {
      events.push(specItemToEvent(item, 'uiux'));
    }
  }

  if (eliteRedesignItems && Array.isArray(eliteRedesignItems)) {
    for (const item of eliteRedesignItems.slice().sort((a, b) => a.slug.localeCompare(b.slug))) {
      events.push(specItemToEvent(item, 'uiux'));
    }
  }

  if (auditIssues && Array.isArray(auditIssues)) {
    for (const item of auditIssues.slice().sort((a, b) => a.slug.localeCompare(b.slug))) {
      events.push(specItemToEvent(item, 'audit'));
    }
  }

  if (events.length === 0) {
    console.log('⚠️  No events to send (intake files are empty)');
    process.exit(0);
  }

  console.log(`📊 Found ${events.length} events to send`);
  console.log(`   UI/UX spec items: ${Array.isArray(uiuxSpecItems) ? uiuxSpecItems.length : 0}`);
  console.log(`   Elite redesign items: ${Array.isArray(eliteRedesignItems) ? eliteRedesignItems.length : 0}`);
  console.log(`   Audit issues: ${Array.isArray(auditIssues) ? auditIssues.length : 0}`);
  console.log('');

  // Send events (idempotent via dedupeKey)
  let successCount = 0;
  let failCount = 0;

  for (const event of events) {
    const success = await sendEvent(event, token);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('');
  if (failCount === 0) {
    console.log(`✅ All ${successCount} events sent successfully`);
  } else {
    console.log(`⚠️  Sent ${successCount} events, ${failCount} failed`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});

