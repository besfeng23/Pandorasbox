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
 * - KAIROS_E2E_REGISTER_PLAN=1 (optional; force re-register Track A plan even if one is already active)
 * - KAIROS_E2E_PLAN_MODE=big (optional; registers a richer Track A plan to exercise phases/deps/branches/unmapped tasks)
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

type TaskRollup = { nodeId?: string; task_id?: string; id?: string; blocked?: boolean; is_blocked?: boolean; blockedByBugIds?: string[] };

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

function fail(message: string, details?: any, exitCode = 1): never {
  console.error(`❌ ${message}`);
  if (details !== undefined) {
    console.error(shortJson(details, 5000));
  }
  process.exit(exitCode);
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
  const mode = (process.env.KAIROS_E2E_PLAN_MODE ?? '').trim().toLowerCase();
  if (mode === 'big') {
    return {
      masterPlan: {
        version: `pb.smoke.big.${new Date().toISOString().slice(0, 10)}`,
        nodes: [
          // Dependency chain A → B → C
          {
            nodeId: 'PB-CORE-CHAT-001', // mapped + also present in stabilization gatingRules
            title: 'Chat core',
            phaseId: 1,
            dependsOn: [],
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
          {
            nodeId: 'PB-CORE-THREADS-001', // mapped (partial) + gated by stabilization plan
            title: 'Threads',
            phaseId: 1,
            dependsOn: ['PB-CORE-CHAT-001'],
            eventMappings: [
              {
                type: 'ui.thread.created',
                payloadMatch: ['threadId'],
                updates: { status: 'done', progress: 1.0 },
              },
            ],
          },
          {
            nodeId: 'PB-CORE-MEMORY-001', // unmapped but gated by stabilization plan
            title: 'Memory',
            phaseId: 2,
            dependsOn: ['PB-CORE-THREADS-001'],
            // Intentionally NO eventMappings (partial mapping test)
          },

          // Parallel branch 1 (phase 2)
          {
            nodeId: 'PB-CORE-KB-001', // gated
            title: 'Knowledge base',
            phaseId: 2,
            dependsOn: ['PB-CORE-CHAT-001'],
            eventMappings: [
              {
                type: 'system.kb.upload_completed',
                payloadMatch: ['chunkCount'],
                updates: { status: 'done', progress: 1.0 },
              },
            ],
          },
          {
            nodeId: 'PB-CORE-GRAPH-001', // gated
            title: 'Graph',
            phaseId: 2,
            dependsOn: ['PB-CORE-CHAT-001'],
            // Intentionally unmapped
          },

          // Parallel branch 2 (phase 3)
          {
            nodeId: 'PB-OPS-EXPORT-001', // gated
            title: 'Export',
            phaseId: 3,
            dependsOn: ['PB-CORE-MEMORY-001', 'PB-CORE-KB-001'],
            eventMappings: [
              {
                type: 'system.export.completed',
                payloadMatch: ['userId', 'bytes'],
                updates: { status: 'done', progress: 1.0 },
              },
            ],
          },

          // Unmapped + NOT referenced by stabilization gatingRules (must NOT be blocked)
          {
            nodeId: 'PB-UNMAPPED-OPS-001',
            title: 'Unmapped ops task (should never be blocked by stabilization)',
            phaseId: 3,
            dependsOn: [],
          },
          {
            nodeId: 'PB-UNMAPPED-OPS-002',
            title: 'Unmapped ops task 2 (should never be blocked by stabilization)',
            phaseId: 3,
            dependsOn: ['PB-UNMAPPED-OPS-001'],
            // Add an event mapping that is NOT in our sample ingest below (noise)
            eventMappings: [
              {
                type: 'system.ratelimit.triggered',
                payloadMatch: ['limitType'],
                updates: { status: 'in_progress', progressDelta: 0.0 },
              },
            ],
          },
        ],
      },
    };
  }

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

function planRegisterPayloadCandidates(payload: any): any[] {
  // Base44 has historically accepted multiple shapes. We try:
  // 1) { masterPlan: { version, nodes } } (repo-side canonical)
  // 2) { version, nodes } (flattened)
  // 3) { plan_version, nodes } (some validators look for plan_version)
  const mp = payload?.masterPlan;
  const version = mp?.version ?? payload?.version ?? payload?.plan_version;
  const nodes = mp?.nodes ?? payload?.nodes;
  const flattened = version && nodes ? { version, nodes } : null;
  const flattenedPlanVersion = version && nodes ? { plan_version: version, nodes } : null;
  return [payload, ...(flattened ? [flattened] : []), ...(flattenedPlanVersion ? [flattenedPlanVersion] : [])];
}

function isPlanRegisterRetryable(res: HttpResult): boolean {
  if (res.ok) return false;
  // If the endpoint is changing shape, we retry on these common signals.
  if (res.status === 400) {
    const txt = (res.bodyText ?? '').toLowerCase();
    if (txt.includes('missing version') || txt.includes('plan_version') || txt.includes('invalid plan json')) return true;
    if (txt.includes('invalid json')) return true;
  }
  // Some Base44 errors surface as 500 for shape mismatches.
  if (res.status === 500) return true;
  return false;
}

function collectBlockedNodeIdsFromStabilizationPlan(stab: any): Set<string> {
  const out = new Set<string>();
  const planJson = stab?.plan_json;
  const gatingRules = Array.isArray(planJson?.gatingRules) ? planJson.gatingRules : [];
  for (const rule of gatingRules) {
    const blocks = Array.isArray(rule?.blocksNodes) ? rule.blocksNodes : [];
    for (const nodeId of blocks) {
      if (typeof nodeId === 'string' && nodeId.trim()) out.add(nodeId.trim());
    }
  }
  return out;
}

type TaskLike = { id?: string; nodeId?: string; task_id?: string; blocked?: boolean; is_blocked?: boolean };

function collectTasksFromActivePlanResponse(activePlan: any): TaskLike[] {
  const rollups = activePlan?.rollups;
  const candidates: any[] = [];
  if (Array.isArray(rollups?.tasks)) candidates.push(...rollups.tasks);
  if (Array.isArray(activePlan?.tasks)) candidates.push(...activePlan.tasks);
  if (Array.isArray(activePlan?.plan?.tasks)) candidates.push(...activePlan.plan.tasks);
  if (Array.isArray(activePlan?.plan_json?.tasks)) candidates.push(...activePlan.plan_json.tasks);
  if (Array.isArray(activePlan?.plan?.plan_json?.nodes)) candidates.push(...activePlan.plan.plan_json.nodes);
  if (Array.isArray(activePlan?.plan?.plan_json?.tasks)) candidates.push(...activePlan.plan.plan_json.tasks);
  return candidates.filter((x) => x && typeof x === 'object');
}

function normalizeNodeId(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  return t ? t : null;
}

function taskNodeId(t: TaskRollup | TaskLike): string | null {
  return normalizeNodeId((t as any).nodeId ?? (t as any).task_id ?? (t as any).id);
}

function getRollupTasks(activePlan: any): TaskRollup[] {
  const tasks = activePlan?.rollups?.tasks;
  if (!Array.isArray(tasks)) return [];
  return tasks.filter((t: any) => t && typeof t === 'object');
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
  const forceRegisterPlan = (process.env.KAIROS_E2E_REGISTER_PLAN ?? '0').trim() === '1';
  const planMode = (process.env.KAIROS_E2E_PLAN_MODE ?? '').trim().toLowerCase();

  let stabilizationActive: any | null = null;
  let expectedNodeIds: string[] = [];
  let expectedNodeCount: number | null = null;
  let recomputeTasksProcessed: number | null = null;
  let rollupsTasksLength: number | null = null;
  let overblockingMismatches: number | null = null;
  let unmappedBlocked: Record<string, boolean | null> = {
    'PB-UNMAPPED-OPS-001': null,
    'PB-UNMAPPED-OPS-002': null,
  };

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
    const payload = samplePlanPayload();
    const nodes = payload?.masterPlan?.nodes;
    if (Array.isArray(nodes)) {
      expectedNodeIds = nodes
        .map((n: any) => normalizeNodeId(n?.nodeId))
        .filter((x: any): x is string => typeof x === 'string');
      expectedNodeCount = expectedNodeIds.length;
    }

    if (planMode === 'big' && !forceRegisterPlan) {
      // Hard contract: the validation is based on the plan we register.
      // Avoid accidental comparisons against a previously-active plan.
      fail(
        'KAIROS_E2E_PLAN_MODE=big requires KAIROS_E2E_REGISTER_PLAN=1 (to avoid validating against a stale active plan).',
        {
          KAIROS_E2E_PLAN_MODE: planMode,
          KAIROS_E2E_REGISTER_PLAN: process.env.KAIROS_E2E_REGISTER_PLAN ?? '',
        }
      );
    }

    // Safety: do not overwrite an existing active plan unless explicitly requested.
    const existing = await requestJson('GET', endpoints.activePlanUrl);
    const hasActivePlan =
      existing.ok &&
      existing.json &&
      typeof existing.json === 'object' &&
      (existing.json.plan || existing.json.active_plan || existing.json.plan_json);

    if (hasActivePlan && !forceRegisterPlan) {
      console.log('✅ Active plan already present; skipping re-register.');
      console.log('   (Set KAIROS_E2E_REGISTER_PLAN=1 to force POST /functions/kairosRegisterPlan)');
      if (planMode) console.log(`   (Note: KAIROS_E2E_PLAN_MODE=${planMode} is set, but plan register is skipped.)`);
      console.log('');
    } else {
      const candidates = planRegisterPayloadCandidates(payload);

      let last: HttpResult | null = null;
      for (let i = 0; i < candidates.length; i++) {
        const attemptPayload = candidates[i];
        const res = await requestJson('POST', endpoints.planRegisterUrl, attemptPayload);
        last = res;
        console.log(`HTTP ${res.status} ${res.statusText}${candidates.length > 1 ? ` (shape ${i + 1}/${candidates.length})` : ''}`);
        if (res.ok) {
          if (res.json) console.log(shortJson(res.json));
          console.log('');
          last = null;
          break;
        }

        const hint =
          res.status === 404 || res.status === 501 || res.status === 405
            ? 'Base44 function endpoint may not be deployed yet (expected: /functions/kairosRegisterPlan).'
            : '';
        if (hint) console.log(`Hint: ${hint}`);
        if (res.bodyText) console.log(res.bodyText);

        if (i < candidates.length - 1 && isPlanRegisterRetryable(res)) {
          console.log('↩️  Retrying with alternate plan JSON shape...');
          continue;
        }
        console.log('');
        break;
      }

      if (last) {
        process.exit(1);
      }
    }
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
    console.log('');
    banner('2b) Confirm Track B active');
    {
      // Some deployments may take a moment to surface the newly-activated plan.
      // Poll briefly for eventual-consistency without masking real failures.
      const maxAttempts = 8;
      const delayMs = 750;
      let last: HttpResult | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const res = await requestJson('GET', endpoints.stabilizationActiveUrl);
        last = res;
        if (res.ok) {
          console.log(`HTTP ${res.status} ${res.statusText} (attempt ${attempt}/${maxAttempts})`);
          stabilizationActive = res.json ?? null;
          if (res.json) console.log(shortJson(res.json));
          console.log('');
          break;
        }

        const body = (res.bodyText ?? '').trim();
        const isNoActive =
          res.status === 404 &&
          (body.includes('NO_ACTIVE_STABILIZATION') ||
            (res.json && typeof res.json === 'object' && (res.json.error === 'NO_ACTIVE_STABILIZATION')));

        if (!isNoActive) {
          console.log(`HTTP ${res.status} ${res.statusText} (attempt ${attempt}/${maxAttempts})`);
          console.log(
            '❌ Track B active check failed. If you saw 404/KeyError, Base44 has not registered/deployed kairosGetActiveStabilization.'
          );
          if (res.bodyText) console.log(res.bodyText);
          process.exit(2);
        }

        if (attempt < maxAttempts) {
          console.log(`HTTP ${res.status} ${res.statusText} (attempt ${attempt}/${maxAttempts}) - waiting...`);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
      }

      if (last && !last.ok) {
        console.log(`HTTP ${last.status} ${last.statusText} (attempt ${maxAttempts}/${maxAttempts})`);
        console.log('❌ Track B active never became available after register.');
        if (last.bodyText) console.log(last.bodyText);
        process.exit(2);
      }
    }
  } else {
    console.log('Skipping (set KAIROS_ENABLE_STABILIZATION=1 to enable).');
  }
  console.log('');

  banner('3) Ingest 1 sample event (batch wrapper form)');
  {
    const nowIso = new Date().toISOString();
    const common = {
      threadId: 'smoke_thread_123',
      messageId: 'smoke_message_456',
      assistantMessageId: 'smoke_assistant_001',
      userId: 'smoke_user_789',
    };

    const events =
      planMode === 'big'
        ? [
            // PB-CORE-CHAT-001 (mapped)
            {
              event_id: 'smoke_event_chat_done',
              event_time: nowIso,
              event_type: 'system.chat.response_completed',
              source: 'pandorasbox',
              payload: { threadId: common.threadId, assistantMessageId: common.assistantMessageId, userId: common.userId },
            },
            // PB-CORE-THREADS-001 (mapped)
            {
              event_id: 'smoke_event_thread_created',
              event_time: nowIso,
              event_type: 'ui.thread.created',
              source: 'pandorasbox',
              payload: { threadId: common.threadId, userId: common.userId },
            },
            // PB-CORE-KB-001 (mapped)
            {
              event_id: 'smoke_event_kb_done',
              event_time: nowIso,
              event_type: 'system.kb.upload_completed',
              source: 'pandorasbox',
              payload: { chunkCount: 7, userId: common.userId },
            },
            // PB-OPS-EXPORT-001 (mapped)
            {
              event_id: 'smoke_event_export_done',
              event_time: nowIso,
              event_type: 'system.export.completed',
              source: 'pandorasbox',
              payload: { userId: common.userId, bytes: 12345 },
            },
            // Noise event (not mapped in our big plan) — should not move completion unless plan maps it
            {
              event_id: 'smoke_event_noise',
              event_time: nowIso,
              event_type: 'fix.completed',
              source: 'pandorasbox',
              payload: { id: 'smoke_fix_001', files: ['README.md'] },
            },
          ]
        : [
            {
              event_id: 'smoke_event_001',
              event_time: nowIso,
              event_type: 'ui.chat.message_sent',
              source: 'pandorasbox',
              payload: {
                threadId: common.threadId,
                messageId: common.messageId,
                userId: common.userId,
              },
            },
          ];

    const res = await requestJson('POST', endpoints.ingestUrl, { events });
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

    // Hard contract checks (big plan mode)
    if (planMode === 'big') {
      if (!res.json || typeof res.json !== 'object') {
        fail('Recompute response did not contain JSON', { status: res.status, bodyText: res.bodyText });
      }
      const tp = (res.json as any).tasks_processed;
      if (typeof tp !== 'number') {
        fail('Recompute response is missing numeric tasks_processed', res.json);
      }
      recomputeTasksProcessed = tp;
      if (expectedNodeCount == null) {
        fail('Internal error: expectedNodeCount not computed from registered big plan');
      }
      if (tp !== expectedNodeCount) {
        fail('Recompute did not process ALL nodes (tasks_processed mismatch)', {
          expectedNodeCount,
          tasks_processed: tp,
          planNodeIds: expectedNodeIds,
        });
      }
    }
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
      // Best-effort: summarize possible blocking signals if present.
      try {
        const jsonText = JSON.stringify(res.json);
        const hasBlocked = jsonText.includes('"blocked"') || jsonText.includes('"BLOCKED"');
        if (hasBlocked) {
          console.log('🔎 Detected "blocked" in active plan response (best-effort heuristic).');
        }
      } catch {
        // ignore
      }
      console.log(shortJson(res.json));

      if (enableStabilization && stabilizationActive) {
        banner('6) Assert stabilization gating is not over-blocking (repo-side check)');
        const gatedNodeIds = collectBlockedNodeIdsFromStabilizationPlan(stabilizationActive);

        // Hard contract: rollups.tasks must exist (big plan mode)
        const rollupTasks = getRollupTasks(res.json);
        rollupsTasksLength = rollupTasks.length;

        if (planMode === 'big') {
          if (!res.json.rollups || !Array.isArray(res.json.rollups.tasks)) {
            fail('Active plan is missing rollups.tasks[]', res.json);
          }
          if (expectedNodeCount == null) {
            fail('Internal error: expectedNodeCount not computed from registered big plan');
          }
          if (rollupTasks.length !== expectedNodeCount) {
            const taskIds = rollupTasks.map((t) => taskNodeId(t)).filter((x): x is string => !!x);
            const missing = expectedNodeIds.filter((id) => !taskIds.includes(id));
            fail('Active plan rollups.tasks length mismatch (must be 1 per node)', {
              expectedNodeCount,
              rollupsTasksLength: rollupTasks.length,
              missingNodeIds: missing,
              presentTaskIdsSample: taskIds.slice(0, 50),
            });
          }
        }

        const tasks = rollupTasks.length > 0 ? rollupTasks : collectTasksFromActivePlanResponse(res.json);

        const blocked = tasks.filter((t) => t.blocked === true || t.is_blocked === true);
        const blockedIds = blocked.map((t) => taskNodeId(t as any)).filter((x): x is string => !!x);

        const unexpectedBlocked = blockedIds.filter((id) => !gatedNodeIds.has(id));
        overblockingMismatches = unexpectedBlocked.length;

        console.log(`Tasks inspected: ${tasks.length}`);
        console.log(`Blocked tasks found: ${blockedIds.length}`);
        console.log(`Gated nodeIds (from stabilization plan): ${gatedNodeIds.size}`);

        if (tasks.length === 0) {
          console.log('⚠️  Could not find a task list in the active plan response to assert gating.');
          console.log('    (Expected rollups.tasks[] or plan.plan_json.nodes[] with blocked flags.)');
        } else if (unexpectedBlocked.length > 0) {
          console.log('❌ FAILURE: Found blocked tasks that are NOT in stabilization gating rules:');
          console.log(unexpectedBlocked.slice(0, 50).join(', '));
          process.exit(3);
        } else {
          console.log('✅ OK: No blocked tasks outside stabilization gating rules (no over-blocking detected).');
        }

        // Hard assertion requested: unmapped tasks should not be blocked by stabilization.
        const mustNeverBeBlocked = ['PB-UNMAPPED-OPS-001', 'PB-UNMAPPED-OPS-002'];
        const wronglyBlockedUnmapped = mustNeverBeBlocked.filter((id) => blockedIds.includes(id));
        for (const id of mustNeverBeBlocked) {
          const t = tasks.find((x: any) => taskNodeId(x) === id) as any;
          const b = t ? (t.blocked === true || t.is_blocked === true) : null;
          unmappedBlocked[id] = b;
        }
        if (wronglyBlockedUnmapped.length > 0) {
          console.log('❌ FAILURE: Unmapped tasks were blocked by stabilization:');
          console.log(wronglyBlockedUnmapped.join(', '));
          process.exit(3);
        } else {
          console.log('✅ OK: Unmapped tasks were not blocked by stabilization.');
        }
        console.log('');
      }
    } else if (res.bodyText) {
      console.log(res.bodyText);
    }
    console.log('');
  }

  banner('PASS summary');
  if (planMode === 'big') {
    console.log(`expectedNodeCount     : ${expectedNodeCount ?? 'unknown'}`);
    console.log(`tasks_processed       : ${recomputeTasksProcessed ?? 'unknown'}`);
    console.log(`rollups.tasks length  : ${rollupsTasksLength ?? 'unknown'}`);
    console.log(`overblocking mismatches: ${overblockingMismatches ?? 'unknown'}`);
    console.log(`unmapped blocked flags: ${JSON.stringify(unmappedBlocked)}`);
  }
  console.log('✅ Kairos E2E smoke completed.');
}

main().catch((err: any) => {
  console.error('❌ Fatal error:', err?.message ?? String(err));
  process.exit(1);
});


