/* eslint-disable no-console */
/**
 * Kairos E2E Smoke (cross-platform)
 *
 * Steps:
 * 1) Register Track A plan (POST KAIROS_PLAN_REGISTER_URL)
 * 2) Optionally register Track B stabilization (POST KAIROS_STABILIZATION_REGISTER_URL)
 * 3) Ingest 1 sample event (POST KAIROS_INGEST_URL)
 * 4) Trigger recompute (POST KAIROS_RECOMPUTE_URL)
 * 5) Fetch active plan/rollups (GET KAIROS_ACTIVE_PLAN_URL)
 *
 * Env:
 * - KAIROS_BASE_URL (optional; defaults to https://kairostrack.base44.app)
 * - KAIROS_PLAN_REGISTER_URL / KAIROS_ACTIVE_PLAN_URL / KAIROS_INGEST_URL / KAIROS_RECOMPUTE_URL (optional overrides)
 * - KAIROS_STABILIZATION_REGISTER_URL / KAIROS_STABILIZATION_ACTIVE_URL (optional overrides)
 * - KAIROS_INGEST_KEY (optional; Authorization: Bearer ...)
 * - KAIROS_ENABLE_STABILIZATION=1 (optional; enable Track B register step)
 */

import fs from 'fs';
import path from 'path';
import { resolveKairosEndpoints } from '../src/lib/kairosEndpoints';

type HttpResult = {
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
  bodyText?: string;
  json?: any;
};

function banner(title: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(title);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

function shortJson(obj: any, max = 1200): string {
  try {
    const s = JSON.stringify(obj, null, 2);
    if (s.length <= max) return s;
    return `${s.slice(0, max)}\n... (truncated)`;
  } catch {
    return String(obj);
  }
}

async function requestJson(method: 'GET' | 'POST', url: string, body?: any): Promise<HttpResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const ingestKey = (process.env.KAIROS_INGEST_KEY ?? '').trim();
  if (ingestKey) headers.Authorization = `Bearer ${ingestKey}`;

  const init: RequestInit = {
    method,
    headers,
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const status = res.status;
  const statusText = res.statusText;
  const text = await res.text().catch(() => '');

  let json: any = undefined;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // ignore
    }
  }

  return {
    ok: res.ok,
    status,
    statusText,
    url,
    bodyText: text ? text.slice(0, 5000) : undefined,
    json,
  };
}

function samplePlanPayload() {
  return {
    masterPlan: {
      version: 'pb.smoke.v1',
      nodes: [
        {
          nodeId: 'PB-CORE-CHAT-001',
          eventMappings: [
            {
              type: 'ui.chat.message_sent',
              payloadMatch: ['threadId', 'messageId'],
              updates: { status: 'in_progress', progressDelta: 0.2 },
            },
            {
              type: 'system.chat.response_completed',
              payloadMatch: ['threadId', 'assistantMessageId'],
              updates: { status: 'done', progress: 1.0 },
            },
          ],
        },
      ],
    },
  };
}

function loadStabilizationPayloadOrNull(): any | null {
  const contractPath = path.join(process.cwd(), 'contracts', 'kairos', 'stabilization_sprint_plan.json');
  if (!fs.existsSync(contractPath)) return null;
  try {
    const raw = fs.readFileSync(contractPath, 'utf8');
    const plan = JSON.parse(raw);
    plan.registeredAt = new Date().toISOString();
    plan.source = plan.source ?? 'pandorasbox';
    return plan;
  } catch (err: any) {
    console.error(`❌ Failed to read stabilization contract: ${err?.message ?? String(err)}`);
    return null;
  }
}

async function main() {
  const endpoints = resolveKairosEndpoints(process.env);
  const enableStabilization = (process.env.KAIROS_ENABLE_STABILIZATION ?? '0').trim() === '1';

  banner('Kairos E2E Smoke (Base44 /functions/* endpoints)');
  console.log(`Base URL: ${endpoints.baseUrl}`);
  console.log('');
  console.log(`Plan register:   ${endpoints.planRegisterUrl}`);
  console.log(`Active plan:     ${endpoints.activePlanUrl}`);
  console.log(`Ingest:          ${endpoints.ingestUrl}`);
  console.log(`Recompute:       ${endpoints.recomputeUrl}`);
  console.log(`Stab register:   ${endpoints.stabilizationRegisterUrl}`);
  console.log(`Stab active:     ${endpoints.stabilizationActiveUrl}`);
  console.log('');

  banner('1) Register Track A plan');
  {
    const res = await requestJson('POST', endpoints.planRegisterUrl, samplePlanPayload());
    console.log(`HTTP ${res.status} ${res.statusText}`);
    if (!res.ok) {
      const hint =
        res.status === 404 || res.status === 501 || res.status === 405
          ? 'Base44 function endpoint may not be deployed yet (expected: /functions/kairosRegisterPlan).'
          : '';
      if (hint) console.log(`Hint: ${hint}`);
      if (res.bodyText) console.log(res.bodyText);
      process.exit(1);
    }
    if (res.json) console.log(shortJson(res.json));
    console.log('');
  }

  banner('2) (Optional) Register Track B stabilization');
  if (enableStabilization) {
    const payload = loadStabilizationPayloadOrNull();
    if (!payload) {
      console.log('⚠️  No stabilization contract found/readable; skipping.');
    } else {
      const res = await requestJson('POST', endpoints.stabilizationRegisterUrl, payload);
      console.log(`HTTP ${res.status} ${res.statusText}`);
      if (!res.ok) {
        console.log(
          '⚠️  Stabilization register failed. If you saw 404/501, Base44 may not have deployed Track B functions yet.'
        );
        if (res.bodyText) console.log(res.bodyText);
      } else {
        if (res.json) console.log(shortJson(res.json));
      }
    }
  } else {
    console.log('Skipping (set KAIROS_ENABLE_STABILIZATION=1 to enable).');
  }
  console.log('');

  banner('3) Ingest 1 sample event (batch wrapper form)');
  {
    const nowIso = new Date().toISOString();
    const event = {
      event_id: 'smoke_event_001',
      event_time: nowIso,
      event_type: 'ui.chat.message_sent',
      source: 'pandorasbox',
      payload: {
        threadId: 'smoke_thread_123',
        messageId: 'smoke_message_456',
        userId: 'smoke_user_789',
      },
    };
    const res = await requestJson('POST', endpoints.ingestUrl, { events: [event] });
    console.log(`HTTP ${res.status} ${res.statusText}`);
    if (!res.ok) {
      if (res.bodyText) console.log(res.bodyText);
      process.exit(1);
    }
    if (res.json) console.log(shortJson(res.json));
    console.log('');
  }

  banner('4) Trigger recompute');
  {
    const res = await requestJson('POST', endpoints.recomputeUrl, { full: true, reason: 'smoke' });
    console.log(`HTTP ${res.status} ${res.statusText}`);
    if (!res.ok) {
      if (res.bodyText) console.log(res.bodyText);
      process.exit(1);
    }
    if (res.json) console.log(shortJson(res.json));
    console.log('');
  }

  banner('5) Fetch active plan / rollups');
  {
    const res = await requestJson('GET', endpoints.activePlanUrl);
    console.log(`HTTP ${res.status} ${res.statusText}`);
    if (!res.ok) {
      if (res.bodyText) console.log(res.bodyText);
      process.exit(1);
    }
    if (res.json) {
      const top = res.json && typeof res.json === 'object' ? Object.keys(res.json) : [];
      console.log(`Top-level keys: ${top.join(', ')}`);
      console.log(shortJson(res.json));
    } else if (res.bodyText) {
      console.log(res.bodyText);
    }
    console.log('');
  }

  banner('Done');
  console.log('✅ Kairos E2E smoke completed (plan + events + recompute + active plan fetched).');
}

main().catch((err: any) => {
  console.error('❌ Fatal error:', err?.message ?? String(err));
  process.exit(1);
});


