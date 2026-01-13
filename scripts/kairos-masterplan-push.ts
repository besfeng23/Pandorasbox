/* eslint-disable no-console */
/**
 * Push & activate the real Track A master plan into Base44 Kairos.
 *
 * - Reads `kairos/master-plan.json` (single source of truth)
 * - POSTs to Base44 `kairosRegisterPlan`
 * - Verifies activation via `kairosGetActivePlan`
 * - Prints: active version, node count, first 10 node IDs
 *
 * Env:
 * - KAIROS_BASE_URL (optional; defaults to https://kairostrack.base44.app)
 * - KAIROS_PLAN_REGISTER_URL / KAIROS_ACTIVE_PLAN_URL (optional overrides)
 * - KAIROS_INGEST_KEY (optional bearer)
 */

import fs from 'fs';
import path from 'path';
import { resolveKairosEndpoints } from '../src/lib/kairosEndpoints';

type HttpResult = { ok: boolean; status: number; statusText: string; bodyText: string; json?: any };

function fail(msg: string, details?: any): never {
  console.error(`❌ ${msg}`);
  if (details !== undefined) {
    try {
      console.error(JSON.stringify(details, null, 2));
    } catch {
      console.error(String(details));
    }
  }
  process.exit(1);
}

function normalizeId(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  return t ? t : null;
}

function collectNodeIdsFromMasterPlan(masterPlan: any): string[] {
  const out: string[] = [];

  // phases -> milestones -> tasks
  const phases = Array.isArray(masterPlan?.phases) ? masterPlan.phases : [];
  for (const p of phases) {
    const milestones = Array.isArray(p?.milestones) ? p.milestones : [];
    for (const m of milestones) {
      const tasks = Array.isArray(m?.tasks) ? m.tasks : [];
      for (const t of tasks) {
        const id = normalizeId(t?.nodeId ?? t?.id);
        if (id) out.push(id);
      }
    }
  }

  // nodes[]
  const nodes = Array.isArray(masterPlan?.nodes) ? masterPlan.nodes : [];
  for (const n of nodes) {
    const id = normalizeId(n?.nodeId ?? n?.id);
    if (id) out.push(id);
  }

  // stable unique
  return Array.from(new Set(out));
}

function buildNodesOnlyPayloadFromPhases(masterPlan: any): { masterPlan: { version: string; nodes: any[] } } | null {
  const version = normalizeId(masterPlan?.version ?? masterPlan?.plan_version);
  if (!version) return null;

  const phases = Array.isArray(masterPlan?.phases) ? masterPlan.phases : [];
  if (phases.length === 0) return null;

  const nodes: any[] = [];
  for (const p of phases) {
    const phaseId = p?.phaseId;
    const phaseTitle = p?.title;
    const milestones = Array.isArray(p?.milestones) ? p.milestones : [];
    for (const m of milestones) {
      const milestoneId = m?.milestoneId;
      const milestoneTitle = m?.title;
      const tasks = Array.isArray(m?.tasks) ? m.tasks : [];
      for (const t of tasks) {
        const nodeId = normalizeId(t?.nodeId ?? t?.id);
        if (!nodeId) continue;
        const node: any = {
          nodeId,
          id: nodeId,
          title: t?.title ?? nodeId,
          weight: t?.weight ?? undefined,
          dependsOn: Array.isArray(t?.dependsOn) ? t.dependsOn : [],
          phaseId: phaseId ?? undefined,
          phaseTitle: phaseTitle ?? undefined,
          milestoneId: milestoneId ?? undefined,
          milestoneTitle: milestoneTitle ?? undefined,
        };
        if (Array.isArray(t?.eventMappings)) node.eventMappings = t.eventMappings;
        // Strip undefined keys for cleanliness
        Object.keys(node).forEach((k) => node[k] === undefined && delete node[k]);
        nodes.push(node);
      }
    }
  }

  return { masterPlan: { version, nodes } };
}

function planRegisterPayloadCandidates(payload: any): any[] {
  // Accept both { masterPlan: {...} } and flattened { version, nodes, phases }.
  const mp = payload?.masterPlan;
  const version = mp?.version ?? payload?.version ?? payload?.plan_version;
  const nodes = mp?.nodes ?? payload?.nodes;
  const phases = mp?.phases ?? payload?.phases;

  const flattened: any = {};
  if (version) flattened.version = version;
  if (nodes) flattened.nodes = nodes;
  if (phases) flattened.phases = phases;

  const flattenedPlanVersion: any = {};
  if (version) flattenedPlanVersion.plan_version = version;
  if (nodes) flattenedPlanVersion.nodes = nodes;
  if (phases) flattenedPlanVersion.phases = phases;

  const out = [payload];
  if (Object.keys(flattened).length > 0) out.push(flattened);
  if (Object.keys(flattenedPlanVersion).length > 0) out.push(flattenedPlanVersion);
  return out;
}

async function requestJson(method: 'GET' | 'POST', url: string, body?: any): Promise<HttpResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const ingestKey = (process.env.KAIROS_INGEST_KEY ?? '').trim();
  if (ingestKey) headers.Authorization = `Bearer ${ingestKey}`;

  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text().catch(() => '');
  let json: any = undefined;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // ignore
    }
  }
  return { ok: res.ok, status: res.status, statusText: res.statusText, bodyText: text, json };
}

function shortList(ids: string[], n = 10): string[] {
  return ids.slice(0, n);
}

async function main() {
  const endpoints = resolveKairosEndpoints(process.env);
  const repoRoot = process.cwd();
  const filePath = path.join(repoRoot, 'kairos', 'master-plan.json');

  if (!fs.existsSync(filePath)) {
    fail(`Missing required file: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const masterPlan = parsed?.masterPlan ?? parsed;

  const version = normalizeId(masterPlan?.version ?? masterPlan?.plan_version);
  if (!version) {
    fail('master-plan.json missing masterPlan.version');
  }

  const expectedNodeIds = collectNodeIdsFromMasterPlan(masterPlan);
  const expectedNodeCount = expectedNodeIds.length;
  if (expectedNodeCount <= 0) {
    fail('master-plan.json contains zero nodes/tasks (expectedNodeCount=0)', { version });
  }

  console.log('📦 Kairos Master Plan Push');
  console.log(`📄 File: ${path.relative(repoRoot, filePath)}`);
  console.log(`🧾 Version: ${version}`);
  console.log(`🔢 Expected node count: ${expectedNodeCount}`);
  console.log(`🧩 First 10 node IDs: ${shortList(expectedNodeIds).join(', ')}`);
  console.log('');

  // Base44 `kairosRegisterPlan` currently accepts nodes-based plans reliably.
  // If the file contains phases→milestones→tasks, derive a nodes-only payload that still
  // preserves phase/milestone grouping as node metadata (so Plan Explorer can render a full tree).
  const derivedNodesOnly = buildNodesOnlyPayloadFromPhases(masterPlan);
  const payloadToSend = derivedNodesOnly ?? parsed;
  const candidates = planRegisterPayloadCandidates(payloadToSend);

  console.log(`📤 POST ${endpoints.planRegisterUrl}`);
  let registered = false;
  for (let i = 0; i < candidates.length; i++) {
    const res = await requestJson('POST', endpoints.planRegisterUrl, candidates[i]);
    console.log(`HTTP ${res.status} ${res.statusText} (shape ${i + 1}/${candidates.length})`);
    if (res.ok) {
      registered = true;
      break;
    }
    const text = (res.bodyText ?? '').slice(0, 1200);
    console.log(text);
  }
  if (!registered) {
    fail('Plan registration failed for all supported payload shapes.');
  }

  // Activation: Base44 kairosRegisterPlan is expected to mark it active.
  // Verify deterministically by fetching active plan and matching version.
  console.log('');
  console.log(`🔎 GET ${endpoints.activePlanUrl}`);
  const active = await requestJson('GET', endpoints.activePlanUrl);
  if (!active.ok || !active.json) {
    const bodyLower = (active.bodyText ?? '').toLowerCase();
    const authHint =
      bodyLower.includes('authentication required') || bodyLower.includes('auth') || active.status === 401 || active.status === 403;
    if (authHint && !(process.env.KAIROS_INGEST_KEY ?? '').trim()) {
      fail('Failed to fetch active plan after registration (auth required). Set KAIROS_INGEST_KEY and retry.', {
        status: active.status,
        body: active.bodyText?.slice(0, 1200),
        requiredEnv: ['KAIROS_INGEST_KEY'],
      });
    }
    fail('Failed to fetch active plan after registration', { status: active.status, body: active.bodyText?.slice(0, 1200) });
  }

  const activeVersion =
    normalizeId(active.json?.plan?.plan_json?.version) ??
    normalizeId(active.json?.plan?.plan_version) ??
    normalizeId(active.json?.plan?.plan_json?.plan_version);

  if (activeVersion !== version) {
    fail('Activation failed: active plan version does not match master-plan.json version', {
      expected: version,
      got: activeVersion,
    });
  }

  // Count nodes from active plan response (prefer plan.plan_json tree)
  const activeMp = active.json?.plan?.plan_json ?? {};
  const activeNodeIds = collectNodeIdsFromMasterPlan(activeMp);
  const activeNodeCount = activeNodeIds.length;

  if (activeNodeCount !== expectedNodeCount) {
    const missing = expectedNodeIds.filter((id) => !activeNodeIds.includes(id));
    fail('Active plan node count mismatch', {
      expectedNodeCount,
      activeNodeCount,
      missingNodeIds: missing.slice(0, 50),
    });
  }

  console.log('');
  console.log('✅ Active plan verified');
  console.log(`Active plan version: ${activeVersion}`);
  console.log(`Total node count: ${activeNodeCount}`);
  console.log(`First 10 node IDs: ${shortList(activeNodeIds).join(', ')}`);
  console.log('');
  console.log('💡 Open Kairos Plan Explorer and refresh — it should render phases → milestones → tasks.');
}

main().catch((err: any) => {
  fail('Fatal error', { message: err?.message ?? String(err) });
});


