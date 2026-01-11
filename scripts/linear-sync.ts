/* eslint-disable no-console */
/**
 * Kairos → Linear sync (idempotent)
 *
 * Creates/updates:
 * - Project: "Kairos — Pandora’s Box Control Tower"
 * - Parent issues: Phases (discovered from scripts/seed-phases.ts)
 * - Child issues: Modules mapped to phases (config-driven in scripts/kairos.config.ts)
 *
 * Idempotency:
 * - Stable marker in description: PB-KAIROS:<slug>
 * - Optional local cache: .kairos/linear-map.json
 *
 * Env:
 * - LINEAR_API_KEY (required)
 * - LINEAR_TEAM_KEY (optional; defaults to first accessible team)
 *
 * Run:
 *   npx tsx scripts/linear-sync.ts
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import {
  KAIROS_PROJECT_NAME,
  KAIROS_MARKER_PREFIX,
  MODULES,
  type ModuleDef,
} from './kairos.config';

type StatusJson = {
  phases: Array<{ id: number; title: string; status: 'Done' | 'In Progress' | 'Planned'; percentComplete: number }>;
  modules: Array<{ id: string; name: string; status: 'Done' | 'In Progress' | 'Planned'; percentComplete: number; area: string }>;
};

type LinearMapCache = {
  projectByName: Record<string, string>;
  issueBySlug: Record<string, string>;
  labelByName: Record<string, string>;
  teamByKey: Record<string, string>;
};

const REPO_ROOT = process.cwd();
const CACHE_PATH = path.join(REPO_ROOT, '.kairos', 'linear-map.json');
const LINEAR_ENDPOINT = 'https://api.linear.app/graphql';

function readJson<T>(p: string): T | null {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function writeJsonIfChanged(p: string, value: any) {
  const text = JSON.stringify(value, null, 2) + '\n';
  if (fs.existsSync(p)) {
    const existing = fs.readFileSync(p, 'utf-8');
    if (existing === text) return false;
  }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text, 'utf-8');
  return true;
}

function shaSlug(input: string) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 10);
}

function marker(slug: string) {
  return `${KAIROS_MARKER_PREFIX}${slug}`;
}

async function linearRequest<T>(apiKey: string, query: string, variables?: Record<string, any>): Promise<T> {
  const res = await fetch(LINEAR_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(`Linear HTTP ${res.status}: ${JSON.stringify(json?.errors || json)}`);
  }
  if (json.errors?.length) {
    throw new Error(`Linear GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

async function getTeam(apiKey: string, teamKey?: string) {
  const data = await linearRequest<{
    viewer: { teams: { nodes: Array<{ id: string; key: string; name: string }> } };
  }>(
    apiKey,
    `query ViewerTeams {
      viewer {
        teams {
          nodes { id key name }
        }
      }
    }`
  );
  const teams = data.viewer.teams.nodes || [];
  if (teams.length === 0) throw new Error('No Linear teams accessible to this API key.');
  if (teamKey) {
    const match = teams.find((t) => t.key === teamKey);
    if (!match) throw new Error(`LINEAR_TEAM_KEY=${teamKey} not found among accessible teams.`);
    return match;
  }
  return teams[0];
}

async function getTeamMeta(apiKey: string, teamId: string) {
  return linearRequest<{
    team: {
      id: string;
      labels: { nodes: Array<{ id: string; name: string }> };
      states: { nodes: Array<{ id: string; name: string; type: string }> };
    };
  }>(
    apiKey,
    `query TeamMeta($teamId: String!) {
      team(id: $teamId) {
        id
        labels { nodes { id name } }
        states { nodes { id name type } }
      }
    }`,
    { teamId }
  );
}

async function ensureLabels(
  apiKey: string,
  teamId: string,
  desired: string[],
  cache: LinearMapCache
): Promise<Record<string, string>> {
  const labelIds: Record<string, string> = {};

  const meta = await getTeamMeta(apiKey, teamId);
  const existing = new Map<string, string>(
    (meta.team.labels.nodes || []).map((l) => [l.name, l.id])
  );

  for (const name of desired) {
    const cached = cache.labelByName[name];
    if (cached) {
      labelIds[name] = cached;
      continue;
    }
    const have = existing.get(name);
    if (have) {
      cache.labelByName[name] = have;
      labelIds[name] = have;
      continue;
    }

    const created = await linearRequest<{ issueLabelCreate: { success: boolean; issueLabel: { id: string; name: string } } }>(
      apiKey,
      `mutation CreateLabel($input: IssueLabelCreateInput!) {
        issueLabelCreate(input: $input) {
          success
          issueLabel { id name }
        }
      }`,
      { input: { teamId, name } }
    );
    const id = created.issueLabelCreate.issueLabel.id;
    cache.labelByName[name] = id;
    labelIds[name] = id;
  }

  return labelIds;
}

async function findProjectByName(apiKey: string, name: string) {
  const data = await linearRequest<{ projects: { nodes: Array<{ id: string; name: string; url: string }> } }>(
    apiKey,
    `query Projects {
      projects(first: 50) { nodes { id name url } }
    }`
  );
  return (data.projects.nodes || []).find((p) => p.name === name) || null;
}

async function ensureProject(apiKey: string, teamId: string, cache: LinearMapCache) {
  const cached = cache.projectByName[KAIROS_PROJECT_NAME];
  if (cached) {
    // Best-effort: we trust cache; project could be deleted out of band.
    return { id: cached, url: '' as string };
  }
  const existing = await findProjectByName(apiKey, KAIROS_PROJECT_NAME);
  if (existing) {
    cache.projectByName[KAIROS_PROJECT_NAME] = existing.id;
    return { id: existing.id, url: existing.url };
  }

  const created = await linearRequest<{ projectCreate: { success: boolean; project: { id: string; name: string; url: string } } }>(
    apiKey,
    `mutation CreateProject($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        success
        project { id name url }
      }
    }`,
    { input: { teamId, name: KAIROS_PROJECT_NAME } }
  );
  const project = created.projectCreate.project;
  cache.projectByName[KAIROS_PROJECT_NAME] = project.id;
  return { id: project.id, url: project.url };
}

async function searchIssueByMarker(apiKey: string, markerText: string) {
  // Use issueSearch query string search (searches title/description).
  // If Linear schema differs, this will throw and callers should treat it as best-effort.
  const data = await linearRequest<{ issueSearch: { nodes: Array<{ id: string; title: string; url: string }> } }>(
    apiKey,
    `query IssueSearch($query: String!) {
      issueSearch(query: $query, first: 1) { nodes { id title url } }
    }`,
    { query: markerText }
  );
  return data.issueSearch.nodes?.[0] || null;
}

async function upsertIssue(params: {
  apiKey: string;
  cache: LinearMapCache;
  teamId: string;
  projectId: string;
  title: string;
  description: string;
  slug: string;
  labelIds: string[];
  parentId?: string;
  stateId?: string;
}) {
  const { apiKey, cache, teamId, projectId, title, description, slug, labelIds, parentId, stateId } = params;
  const cacheKey = slug;
  let issueId = cache.issueBySlug[cacheKey];
  let created = false;

  if (!issueId) {
    const found = await searchIssueByMarker(apiKey, marker(slug));
    if (found?.id) {
      issueId = found.id;
      cache.issueBySlug[cacheKey] = issueId;
    }
  }

  if (!issueId) {
    const createdRes = await linearRequest<{ issueCreate: { success: boolean; issue: { id: string; url: string } } }>(
      apiKey,
      `mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id url }
        }
      }`,
      {
        input: {
          teamId,
          projectId,
          title,
          description,
          labelIds,
          parentId,
          stateId,
        },
      }
    );
    issueId = createdRes.issueCreate.issue.id;
    cache.issueBySlug[cacheKey] = issueId;
    created = true;
  } else {
    await linearRequest<{ issueUpdate: { success: boolean } }>(
      apiKey,
      `mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) { success }
      }`,
      {
        id: issueId,
        input: {
          title,
          description,
          labelIds,
          parentId,
          stateId,
          projectId,
        },
      }
    );
  }

  return { issueId: issueId!, created };
}

function issueDescriptionForPhase(phase: { id: number; title: string; status: string; percentComplete: number }) {
  const slug = `phase-${phase.id}`;
  return [
    `${marker(slug)}`,
    '',
    `Phase epic for Phase ${phase.id}: ${phase.title}.`,
    '',
    `Kairos status: ${phase.status} (${phase.percentComplete}%).`,
    '',
    'Where in code:',
    '- scripts/seed-phases.ts',
    '- PHASE_IMPLEMENTATION_STATUS.md',
    '- docs/09_ROADMAP_AND_STATUS.md',
    '- docs/STATUS.md',
  ].join('\n');
}

function issueDescriptionForModule(module: ModuleDef, status: { status: string; percentComplete: number }, phaseId: number) {
  const slug = `phase-${phaseId}-module-${module.id}`;
  const where = module.signals
    .map((s: any) => {
      if (s.type === 'file_exists') return `- ${s.params.path}`;
      if (s.type === 'glob_exists' || s.type === 'test_exists') return `- ${s.params.glob}`;
      return null;
    })
    .filter(Boolean)
    .slice(0, 12);

  return [
    `${marker(slug)}`,
    '',
    `Module: ${module.name}`,
    `Area: ${module.area}`,
    `Phase: ${phaseId}`,
    `Related module epic: ${marker(`module-${module.id}`)}`,
    '',
    `Kairos status: ${status.status} (${status.percentComplete}%).`,
    '',
    'Acceptance criteria:',
    '- Required repo signals present (files/routes/rules/index/tests per scripts/kairos.config.ts)',
    '- Wired end-to-end where applicable',
    '- Risks addressed if relevant (see docs/STATUS.md)',
    '',
    'Where in code (key entrypoints/signals):',
    ...where,
    '',
    'Docs:',
    '- docs/01_ARCHITECTURE.md',
    '- docs/05_BACKEND_SYSTEM.md',
    '- docs/04_FRONTEND_SYSTEM.md',
    '- docs/06_SECURITY_PRIVACY.md',
  ].join('\n');
}

function issueDescriptionForModuleEpic(module: ModuleDef, status: { status: string; percentComplete: number }) {
  const slug = `module-${module.id}`;
  const where = module.signals
    .map((s: any) => {
      if (s.type === 'file_exists') return `- ${s.params.path}`;
      if (s.type === 'glob_exists' || s.type === 'test_exists') return `- ${s.params.glob}`;
      return null;
    })
    .filter(Boolean)
    .slice(0, 20);

  return [
    `${marker(slug)}`,
    '',
    `Module epic for: ${module.name}`,
    `Area: ${module.area}`,
    '',
    `Kairos status: ${status.status} (${status.percentComplete}%).`,
    '',
    'Where in code (key entrypoints/signals):',
    ...where,
    '',
    'Docs:',
    '- docs/01_ARCHITECTURE.md',
    '- docs/04_FRONTEND_SYSTEM.md',
    '- docs/05_BACKEND_SYSTEM.md',
    '- docs/06_SECURITY_PRIVACY.md',
    '- docs/11_LINEAR_PROJECT_PLAN.md',
    module.id === 'ui-ux' ? '- docs/13_UI_UX_SPEC.md' : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function selectStateId(states: Array<{ id: string; type: string }>, status: 'Done' | 'In Progress' | 'Planned') {
  const byType = new Map(states.map((s) => [s.type, s.id]));
  if (status === 'Done') return byType.get('completed') || undefined;
  if (status === 'In Progress') return byType.get('started') || undefined;
  return byType.get('unstarted') || undefined;
}

async function main() {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    console.error('[kairos] Missing LINEAR_API_KEY. See docs/LINEAR_SETUP.md');
    process.exit(2);
  }
  const teamKey = process.env.LINEAR_TEAM_KEY;

  const statusPath = path.join(REPO_ROOT, 'docs', 'status.json');
  const status = readJson<StatusJson>(statusPath);
  if (!status) {
    console.error('[kairos] Missing docs/status.json. Run npm run docs:status first.');
    process.exit(2);
  }

  const cache: LinearMapCache =
    readJson<LinearMapCache>(CACHE_PATH) || { projectByName: {}, issueBySlug: {}, labelByName: {}, teamByKey: {} };

  const team = await getTeam(apiKey, teamKey);
  if (team.key) cache.teamByKey[team.key] = team.id;

  const meta = await getTeamMeta(apiKey, team.id);
  const states = meta.team.states.nodes || [];

  const project = await ensureProject(apiKey, team.id, cache);

  // Labels: static + dynamic phase/module labels
  const phaseLabels = status.phases.map((p) => `phase:${p.id}`).sort();
  const moduleLabels = MODULES.map((m) => `module:${m.label}`).sort();
  const areaLabels = Array.from(new Set(MODULES.map((m) => `area:${m.area}`))).sort();
  const baseLabels = ['pb-kairos'];

  const allLabels = [...baseLabels, ...phaseLabels, ...moduleLabels, ...areaLabels];
  const labelIdByName = await ensureLabels(apiKey, team.id, allLabels, cache);

  let createdCount = 0;
  let updatedCount = 0;

  // Upsert phase epics
  const phaseEpicIdByPhase = new Map<number, string>();
  for (const p of status.phases.slice().sort((a, b) => a.id - b.id)) {
    const slug = `phase-${p.id}`;
    const desc = issueDescriptionForPhase(p);
    const stateId = selectStateId(states, p.status);
    const labelIds = [labelIdByName['pb-kairos'], labelIdByName[`phase:${p.id}`]].filter(Boolean);

    const res = await upsertIssue({
      apiKey,
      cache,
      teamId: team.id,
      projectId: project.id,
      title: `Phase ${p.id}: ${p.title}`,
      description: desc,
      slug,
      labelIds,
      stateId,
    });
    phaseEpicIdByPhase.set(p.id, res.issueId);
    if (res.created) createdCount++;
    else updatedCount++;
  }

  // Upsert module epics (top-level)
  const moduleEpicIdByModule = new Map<string, string>();
  const moduleStatusById = new Map(status.modules.map((m) => [m.id, m]));
  for (const m of MODULES) {
    const moduleStatus = moduleStatusById.get(m.id) || { status: 'Planned', percentComplete: 0 };
    const slug = `module-${m.id}`;
    const desc = issueDescriptionForModuleEpic(m, moduleStatus as any);
    const stateId = selectStateId(states, moduleStatus.status as any);
    const labelIds = [
      labelIdByName['pb-kairos'],
      labelIdByName[`module:${m.label}`],
      labelIdByName[`area:${m.area}`],
    ].filter(Boolean);

    const res = await upsertIssue({
      apiKey,
      cache,
      teamId: team.id,
      projectId: project.id,
      title: `Module: ${m.name}`,
      description: desc,
      slug,
      labelIds,
      stateId,
    });
    moduleEpicIdByModule.set(m.id, res.issueId);
    if (res.created) createdCount++;
    else updatedCount++;
  }

  // Upsert module issues under mapped phases
  for (const m of MODULES) {
    const moduleStatus = moduleStatusById.get(m.id) || { status: 'Planned', percentComplete: 0 };
    const phaseIds = (m.phaseIds || []).slice().sort((a, b) => a - b);
    for (const phaseId of phaseIds) {
      const parentId = phaseEpicIdByPhase.get(phaseId);
      if (!parentId) continue;
      const slug = `phase-${phaseId}-module-${m.id}`;
      const desc = issueDescriptionForModule(m, moduleStatus as any, phaseId);
      const stateId = selectStateId(states, moduleStatus.status as any);
      const labelIds = [
        labelIdByName['pb-kairos'],
        labelIdByName[`phase:${phaseId}`],
        labelIdByName[`module:${m.label}`],
        labelIdByName[`area:${m.area}`],
      ].filter(Boolean);

      const res = await upsertIssue({
        apiKey,
        cache,
        teamId: team.id,
        projectId: project.id,
        title: `${m.name} (Phase ${phaseId})`,
        description: desc,
        slug,
        labelIds,
        parentId,
        stateId,
      });
      if (res.created) createdCount++;
      else updatedCount++;
    }
  }

  const wroteCache = writeJsonIfChanged(CACHE_PATH, cache);

  console.log(`[kairos] Linear project: ${KAIROS_PROJECT_NAME}${project.url ? ` (${project.url})` : ''}`);
  console.log(`[kairos] Created: ${createdCount}`);
  console.log(`[kairos] Updated: ${updatedCount}`);
  console.log(`[kairos] Updated cache: ${wroteCache ? 'yes' : 'no-change'} (${path.relative(REPO_ROOT, CACHE_PATH)})`);
}

main().catch((err) => {
  console.error(`[kairos] Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});


