/* eslint-disable no-console */
/**
 * Kairos Status Generator (deterministic + idempotent)
 *
 * Outputs:
 * - docs/STATUS.md
 * - docs/status.json
 *
 * Guarantees:
 * - No network access required
 * - Deterministic output for a given repo state (no timestamps)
 * - No secrets printed (never logs env var values)
 *
 * Run:
 *   npx tsx scripts/generate-status.ts
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import vm from 'vm';
import { spawnSync } from 'child_process';

import {
  MODULES,
  PHASE_SIGNAL_MAPPINGS,
  type ModuleDef,
  type Signal,
  type KairosStatus,
} from './kairos.config';

type DiscoveredPhase = {
  id: number;
  title: string;
  description?: string;
  seededStatus?: string;
  dependencies?: string[];
  build_entrypoint?: string;
};

type PhaseStatusFromDoc = {
  id: number;
  status?: string;
  headline?: string;
  implementationFiles?: string[];
  notes?: string[];
};

type RepoInventory = {
  repoRoot: string;
  packageJson: {
    name?: string;
    version?: string;
    scripts: string[];
    dependencies: string[];
    devDependencies: string[];
  };
  configsPresent: Array<{ path: string; sha256: string }>;
  apiRoutes: string[];
  serverActions: string[];
  flows: string[];
  agents: string[];
  mcp: string[];
  firestore: {
    rulesPath: string;
    indexesPath: string;
    collectionsUsed: string[];
    envVarsUsed: string[];
  };
  tests: string[];
  hardcodedFindings: {
    emails: Array<{ file: string; value: string }>;
    urls: Array<{ file: string; value: string }>;
  };
};

type StatusJson = {
  overall: {
    percentComplete: number;
  };
  checks: {
    typecheck?: { ok: boolean; exitCode: number | null; command: string; message?: string };
    lint?: { ok: boolean; exitCode: number | null; command: string; message?: string };
    test?: { ok: boolean; exitCode: number | null; command: string; message?: string };
  };
  phases: Array<{
    id: number;
    title: string;
    status: KairosStatus;
    percentComplete: number;
    seededStatus?: string;
    statusDocStatus?: string;
    evidence: {
      signals: Array<{ id: string; ok: boolean; weight: number; type: string; details?: string }>;
      whereInCode: string[];
      notes: string[];
    };
  }>;
  modules: Array<{
    id: string;
    name: string;
    status: KairosStatus;
    percentComplete: number;
    area: string;
    evidence: {
      signals: Array<{ id: string; ok: boolean; weight: number; type: string; details?: string }>;
      whereInCode: string[];
      notes: string[];
    };
  }>;
  topNextActions: Array<{ id: string; title: string; rationale: string }>;
  topRisks: Array<{ id: string; title: string; severity: 'low' | 'medium' | 'high'; details: string }>;
  repoInventory: RepoInventory;
};

const REPO_ROOT = process.cwd();

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.firebase',
  // This repo contains a nested `Pandorasbox/` subtree in the workspace snapshot.
  // It may have different permissions; Kairos ignores it to keep scans safe/deterministic.
  'Pandorasbox',
  'functions/node_modules',
]);

function stableSha256(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function readText(p: string) {
  return fs.readFileSync(p, 'utf-8');
}

function exists(p: string) {
  return fs.existsSync(p);
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFileIfChanged(targetPath: string, content: string) {
  if (exists(targetPath)) {
    const existing = fs.readFileSync(targetPath, 'utf-8');
    if (existing === content) return false;
  }
  fs.writeFileSync(targetPath, content, 'utf-8');
  return true;
}

function listFilesRecursive(root: string, predicate?: (absPath: string) => boolean): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length) {
    const current = stack.pop()!;
    const rel = path.relative(REPO_ROOT, current).replace(/\\/g, '/');
    const base = path.basename(current);

    if (fs.statSync(current).isDirectory()) {
      if (IGNORE_DIRS.has(base)) continue;
      if (IGNORE_DIRS.has(rel)) continue;
      let entries: string[] = [];
      try {
        entries = fs.readdirSync(current);
      } catch {
        // Permission or IO issue: skip directory to keep generator robust.
        continue;
      }
      for (const entry of entries) {
        const abs = path.join(current, entry);
        // Skip dot dirs/files for determinism and speed
        if (entry.startsWith('.')) continue;
        stack.push(abs);
      }
    } else {
      if (!predicate || predicate(current)) {
        out.push(current);
      }
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function globToRegex(glob: string): RegExp {
  // Minimal glob: **, *, ?, and character escaping.
  const escaped = glob
    .replace(/\\/g, '/')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '___GLOBSTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___GLOBSTAR___/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

function findByGlob(glob: string): string[] {
  const re = globToRegex(glob);
  const baseDir = REPO_ROOT;
  const files = listFilesRecursive(baseDir, (p) => fs.statSync(p).isFile());
  const matches: string[] = [];
  for (const abs of files) {
    const rel = path.relative(REPO_ROOT, abs).replace(/\\/g, '/');
    if (re.test(rel)) matches.push(rel);
  }
  matches.sort();
  return matches;
}

function parseSeedPhases(): DiscoveredPhase[] {
  const seedPath = path.join(REPO_ROOT, 'scripts', 'seed-phases.ts');
  if (!exists(seedPath)) {
    throw new Error('scripts/seed-phases.ts not found; cannot discover phases.');
  }
  const src = readText(seedPath);
  const marker = 'const phases = [';
  const start = src.indexOf(marker);
  if (start < 0) {
    throw new Error('Could not locate `const phases = [` in scripts/seed-phases.ts');
  }
  const from = start + marker.length;
  // Find the matching closing bracket for the array literal.
  let depth = 1;
  let i = from;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (depth === 0) break;
  }
  if (depth !== 0) {
    throw new Error('Unbalanced brackets while parsing phases array in scripts/seed-phases.ts');
  }
  const arrayLiteral = src.slice(from - 1, i + 1); // include leading '[' and trailing ']'
  const context = vm.createContext(Object.freeze({}));
  const evaluated = vm.runInContext(`(${arrayLiteral})`, context, { timeout: 50 });
  if (!Array.isArray(evaluated)) {
    throw new Error('Parsed phases is not an array');
  }
  const phases: DiscoveredPhase[] = evaluated
    .map((p: any) => ({
      id: Number(p.id),
      title: String(p.title),
      description: p.description ? String(p.description) : undefined,
      seededStatus: p.status ? String(p.status) : undefined,
      dependencies: Array.isArray(p.dependencies) ? p.dependencies.map(String) : undefined,
      build_entrypoint: p.build_entrypoint ? String(p.build_entrypoint) : undefined,
    }))
    .filter((p) => Number.isFinite(p.id) && p.id > 0 && p.title.length > 0)
    .sort((a, b) => a.id - b.id);

  return phases;
}

function parsePhaseStatusDoc(): PhaseStatusFromDoc[] {
  const p = path.join(REPO_ROOT, 'PHASE_IMPLEMENTATION_STATUS.md');
  if (!exists(p)) return [];
  const text = readText(p);
  const lines = text.split(/\r?\n/);

  const phases: PhaseStatusFromDoc[] = [];
  let current: PhaseStatusFromDoc | null = null;
  let inFiles = false;

  for (const line of lines) {
    const phaseMatch = line.match(/^##\s+Phase\s+(\d+):\s*(.+)$/);
    if (phaseMatch) {
      if (current) phases.push(current);
      current = {
        id: Number(phaseMatch[1]),
        headline: phaseMatch[2].trim(),
        implementationFiles: [],
        notes: [],
      };
      inFiles = false;
      continue;
    }
    if (!current) continue;

    const statusMatch = line.match(/^\*\*Status:\*\*\s*(.+?)\s*$/);
    if (statusMatch) {
      current.status = statusMatch[1].trim();
      continue;
    }

    if (line.trim() === '**Implementation Files:**') {
      inFiles = true;
      continue;
    }
    if (inFiles) {
      const fileLine = line.match(/^\-\s+`([^`]+)`\s*\-\s*(.*)$/);
      if (fileLine) {
        current.implementationFiles!.push(fileLine[1]);
        continue;
      }
      if (line.startsWith('---') || line.startsWith('## ')) {
        inFiles = false;
      }
    }

    if (line.startsWith('**Note:**')) {
      current.notes!.push(line.replace('**Note:**', '').trim());
    }
  }
  if (current) phases.push(current);
  return phases
    .filter((p) => Number.isFinite(p.id))
    .sort((a, b) => a.id - b.id);
}

function extractEnvVarsFromFiles(files: string[]): string[] {
  const envVarRe = /\bprocess\.env\.([A-Z0-9_]+)\b/g;
  const vars = new Set<string>();
  for (const rel of files) {
    const abs = path.join(REPO_ROOT, rel);
    if (!exists(abs)) continue;
    const text = readText(abs);
    let m: RegExpExecArray | null;
    while ((m = envVarRe.exec(text))) {
      vars.add(m[1]);
    }
  }
  return Array.from(vars).sort();
}

function extractFirestoreCollectionsUsed(files: string[]): string[] {
  const re = /\.collection\(\s*['"]([a-zA-Z0-9_]+)['"]\s*\)/g;
  const out = new Set<string>();
  for (const rel of files) {
    const abs = path.join(REPO_ROOT, rel);
    if (!exists(abs)) continue;
    const text = readText(abs);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      out.add(m[1]);
    }
  }
  return Array.from(out).sort();
}

function extractHardcodedEmails(files: string[]): Array<{ file: string; value: string }> {
  const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const results: Array<{ file: string; value: string }> = [];
  for (const rel of files) {
    const abs = path.join(REPO_ROOT, rel);
    if (!exists(abs)) continue;
    const text = readText(abs);
    const matches = text.match(emailRe) || [];
    for (const value of matches) {
      results.push({ file: rel, value });
    }
  }
  // Stable: sort and dedupe
  const dedup = new Map<string, { file: string; value: string }>();
  for (const r of results) {
    dedup.set(`${r.file}::${r.value}`, r);
  }
  return Array.from(dedup.values()).sort((a, b) => (a.file + a.value).localeCompare(b.file + b.value));
}

function extractHardcodedUrls(files: string[]): Array<{ file: string; value: string }> {
  const urlRe = /\bhttps?:\/\/[^\s"')]+/gi;
  const results: Array<{ file: string; value: string }> = [];
  for (const rel of files) {
    const abs = path.join(REPO_ROOT, rel);
    if (!exists(abs)) continue;
    const text = readText(abs);
    const matches = text.match(urlRe) || [];
    for (const value of matches) {
      results.push({ file: rel, value });
    }
  }
  const dedup = new Map<string, { file: string; value: string }>();
  for (const r of results) {
    dedup.set(`${r.file}::${r.value}`, r);
  }
  return Array.from(dedup.values()).sort((a, b) => (a.file + a.value).localeCompare(b.file + b.value));
}

function firestoreRulesCoversCollection(rulesText: string, collection: string): boolean {
  // Handles:
  // match /history/{messageId}
  // match /users/{userId}/{document=**} (covers subcollections)
  // Conservative: require explicit match for root collections; allow /users/{userId}/{document=**} to cover "users".
  const direct = new RegExp(`match\\s+\\/${collection}\\s*\\/\\{`, 'm');
  if (direct.test(rulesText)) return true;
  if (collection === 'users') {
    return /match\s+\/users\/\{userId\}\/\{document=\*\*\}/m.test(rulesText);
  }
  return false;
}

function parseFirestoreIndexes(indexesPath: string): any {
  if (!exists(indexesPath)) return null;
  try {
    return JSON.parse(readText(indexesPath));
  } catch {
    return null;
  }
}

function firestoreHasCompositeIndex(
  indexesJson: any,
  collectionGroup: string,
  fields: Array<{ fieldPath: string; order?: 'ASCENDING' | 'DESCENDING' }>
): boolean {
  if (!indexesJson?.indexes || !Array.isArray(indexesJson.indexes)) return false;
  const desired = fields.filter((f) => f.fieldPath !== '__name__');

  for (const idx of indexesJson.indexes) {
    if (idx.collectionGroup !== collectionGroup) continue;
    if (!Array.isArray(idx.fields)) continue;

    const idxFields = idx.fields
      .filter((f: any) => f.fieldPath !== '__name__')
      .map((f: any) => ({
        fieldPath: f.fieldPath,
        order: f.order,
        vectorConfig: f.vectorConfig ? true : false,
      }));

    // Vector indexes are represented differently. If desired includes embedding without order, treat as vector match.
    const desiredKey = desired.map((d) => `${d.fieldPath}:${d.order || 'VECTOR_OR_NONE'}`).join('|');

    const idxKey = idxFields
      .map((f: any) => `${f.fieldPath}:${f.order || (f.vectorConfig ? 'VECTOR' : 'NONE')}`)
      .join('|');

    // Accept if all desired fields appear in order with the same ordering.
    // This is best-effort; Firestore index equivalence can be more complex.
    if (idxKey.includes(desiredKey.replace(/VECTOR_OR_NONE/g, 'VECTOR'))) return true;
    if (idxKey.includes(desiredKey.replace(/VECTOR_OR_NONE/g, 'NONE'))) return true;
  }
  return false;
}

function evaluateSignal(signal: Signal, ctx: { rulesText: string; indexesJson: any }): { ok: boolean; details?: string } {
  switch (signal.type) {
    case 'file_exists': {
      const p = (signal.params as any).path as string;
      const ok = exists(path.join(REPO_ROOT, p));
      return { ok, details: p };
    }
    case 'glob_exists':
    case 'test_exists':
    case 'api_route_exists': {
      const glob = (signal.params as any).glob as string;
      const matches = findByGlob(glob);
      return { ok: matches.length > 0, details: `${glob} (${matches.length})` };
    }
    case 'action_exists': {
      const { exportName, file } = signal.params as any;
      const abs = path.join(REPO_ROOT, file);
      if (!exists(abs)) return { ok: false, details: `${file}:${exportName}` };
      const text = readText(abs);
      const ok = new RegExp(`export\\s+(async\\s+)?function\\s+${exportName}\\b`).test(text);
      return { ok, details: `${file}:${exportName}` };
    }
    case 'firestore_rules_match': {
      const collection = (signal.params as any).collection as string;
      const ok = firestoreRulesCoversCollection(ctx.rulesText, collection);
      return { ok, details: collection };
    }
    case 'firestore_index_match': {
      const { collectionGroup, fields } = signal.params as any;
      const ok = firestoreHasCompositeIndex(ctx.indexesJson, collectionGroup, fields);
      return { ok, details: `${collectionGroup}(${fields.map((f: any) => f.fieldPath).join(',')})` };
    }
    case 'import_used': {
      const { module, path: filePath } = signal.params as any;
      const abs = path.join(REPO_ROOT, filePath);
      if (!exists(abs)) return { ok: false, details: filePath };
      const text = readText(abs);
      const ok = text.includes(module);
      return { ok, details: `${filePath} contains ${module}` };
    }
    default:
      return { ok: false, details: 'unknown signal type' };
  }
}

function computePercent(signals: Signal[], ctx: { rulesText: string; indexesJson: any }) {
  const evaluated = signals
    .map((s) => {
      const r = evaluateSignal(s, ctx);
      return { signal: s, ok: r.ok, details: r.details };
    })
    .sort((a, b) => a.signal.id.localeCompare(b.signal.id));

  const totalWeight = evaluated.reduce((sum, e) => sum + (e.signal.weight || 0), 0) || 1;
  const achieved = evaluated.reduce((sum, e) => sum + (e.ok ? e.signal.weight : 0), 0);
  const percent = Math.round((achieved / totalWeight) * 100);

  return { percent, evaluated };
}

function mapPercentToStatus(percent: number): KairosStatus {
  if (percent >= 90) return 'Done';
  if (percent >= 40) return 'In Progress';
  return 'Planned';
}

function buildRepoInventory(): RepoInventory {
  const pkgPath = path.join(REPO_ROOT, 'package.json');
  const pkg = JSON.parse(readText(pkgPath));

  const apiRoutes = findByGlob('src/app/api/**/route.ts');
  const serverActions = findByGlob('src/app/actions/*.ts');
  const flows = findByGlob('src/ai/flows/*.ts');
  const agents = findByGlob('src/ai/agents/*.ts');
  const mcp = [
    ...findByGlob('src/mcp/**/*.ts'),
    ...findByGlob('public/openapi-mcp.*'),
  ];
  const tests = [...findByGlob('src/**/__tests__/**/*.test.*'), ...findByGlob('tests/**/*.test.*')];

  const configs = [
    'firebase.json',
    'firestore.rules',
    'firestore.indexes.json',
    'storage.rules',
    'apphosting.yaml',
    'next.config.ts',
    'tsconfig.json',
    'tailwind.config.ts',
    'jest.config.js',
    'ARCHITECTURE.md',
    'API_DOCUMENTATION.md',
    'DEPLOYMENT_RUNBOOK.md',
    'DEPLOYMENT_RUNBOOK_V2.md',
    'PHASE_IMPLEMENTATION_STATUS.md',
  ].filter((p) => exists(path.join(REPO_ROOT, p)));

  const configsPresent = configs
    .map((p) => ({ path: p, sha256: stableSha256(readText(path.join(REPO_ROOT, p))) }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const scanFilesForEnvAndCollections = [
    ...apiRoutes,
    ...serverActions,
    ...flows,
    ...agents,
    ...findByGlob('src/lib/**/*.ts'),
    ...findByGlob('src/mcp/**/*.ts'),
  ].filter((p) => !p.includes('node_modules'));

  const envVarsUsed = extractEnvVarsFromFiles(scanFilesForEnvAndCollections);
  const collectionsUsed = extractFirestoreCollectionsUsed(scanFilesForEnvAndCollections);

  const hardcodedFiles = [
    ...findByGlob('src/app/api/**/route.ts'),
    ...findByGlob('src/mcp/**/*.ts'),
    ...findByGlob('src/lib/**/*.ts'),
    ...findByGlob('public/openapi-mcp.*'),
    ...findByGlob('src/app/api/chatgpt/openapi.yaml'),
  ];

  const hardcodedFindings = {
    emails: extractHardcodedEmails(hardcodedFiles),
    urls: extractHardcodedUrls(hardcodedFiles),
  };

  const dependencies = Object.keys(pkg.dependencies || {}).sort();
  const devDependencies = Object.keys(pkg.devDependencies || {}).sort();
  const scripts = Object.keys(pkg.scripts || {}).sort();

  return {
    repoRoot: REPO_ROOT.replace(/\\/g, '/'),
    packageJson: {
      name: pkg.name,
      version: pkg.version,
      scripts,
      dependencies,
      devDependencies,
    },
    configsPresent,
    apiRoutes,
    serverActions,
    flows,
    agents,
    mcp,
    firestore: {
      rulesPath: 'firestore.rules',
      indexesPath: 'firestore.indexes.json',
      collectionsUsed,
      envVarsUsed,
    },
    tests,
    hardcodedFindings,
  };
}

function buildTopRisks(inventory: RepoInventory, rulesText: string, indexesJson: any) {
  const risks: StatusJson['topRisks'] = [];

  // Hardcoded emails
  const hardcodedEmails = inventory.hardcodedFindings.emails.filter((e) => !e.file.toLowerCase().includes('docs/'));
  if (hardcodedEmails.length > 0) {
    const examples = hardcodedEmails.slice(0, 3).map((e) => `${e.value} in ${e.file}`).join('; ');
    risks.push({
      id: 'hardcoded-email-defaults',
      title: 'Hardcoded email defaults present',
      severity: 'high',
      details: `Detected hardcoded emails in code paths (example(s): ${examples}). Risk: portability + privacy. Follow-up: move to DEFAULT_CHATGPT_USER_EMAIL env var.`,
    });
  }

  // Hardcoded URLs
  const urls = inventory.hardcodedFindings.urls.filter((u) => !u.file.toLowerCase().includes('docs/'));
  if (urls.length > 0) {
    const examples = urls.slice(0, 3).map((u) => `${u.value} in ${u.file}`).join('; ');
    risks.push({
      id: 'hardcoded-urls',
      title: 'Hardcoded URLs/endpoints present',
      severity: 'medium',
      details: `Detected hardcoded URL(s) in code or OpenAPI (example(s): ${examples}). Risk: environment drift across dev/stage/prod.`,
    });
  }

  // Firestore rules coverage
  // Some names are commonly used as subcollections (e.g. users/{uid}/state/*). Do not treat as root-level rules gaps.
  const ignoreForRulesCoverage = new Set(['state']);
  const uncovered = inventory.firestore.collectionsUsed
    .filter((c) => !ignoreForRulesCoverage.has(c))
    .filter((c) => !firestoreRulesCoversCollection(rulesText, c));
  if (uncovered.length > 0) {
    risks.push({
      id: 'firestore-rules-gaps',
      title: 'Potential Firestore rules coverage gaps',
      severity: 'high',
      details: `Collections referenced in code but not matched by an explicit rules stanza: ${uncovered.join(', ')}.`,
    });
  }

  // Best-effort index checks for known query patterns
  // external_knowledge: where query == normalizedQuery orderBy cachedAt desc
  const externalCacheIndexNeeded = inventory.firestore.collectionsUsed.includes('external_knowledge');
  if (externalCacheIndexNeeded) {
    const ok = firestoreHasCompositeIndex(indexesJson, 'external_knowledge', [
      { fieldPath: 'query', order: 'ASCENDING' },
      { fieldPath: 'cachedAt', order: 'DESCENDING' },
    ]);
    if (!ok) {
      risks.push({
        id: 'firestore-index-missing-external-cache',
        title: 'Firestore index may be missing for external_knowledge cache lookups',
        severity: 'medium',
        details:
          'Code queries external_knowledge by query and orders by cachedAt; index may be required depending on Firestore behavior. Where in code: src/lib/external-cache.ts.',
      });
    }
  }

  return risks.sort((a, b) => a.id.localeCompare(b.id));
}

function buildTopNextActions(phases: StatusJson['phases'], modules: StatusJson['modules']) {
  const actions: StatusJson['topNextActions'] = [];

  // Phase-driven: missing phases or partial ones
  const partialPhases = phases.filter((p) => p.status !== 'Done').slice(0, 6);
  for (const p of partialPhases) {
    actions.push({
      id: `phase-${p.id}-advance`,
      title: `Advance Phase ${p.id}: ${p.title}`,
      rationale: `Current status: ${p.status} (${p.percentComplete}%). See docs/09_ROADMAP_AND_STATUS.md and PHASE_IMPLEMENTATION_STATUS.md for gaps.`,
    });
  }

  // Module-driven: lowest scoring modules
  const weakestModules = [...modules]
    .filter((m) => m.status !== 'Done')
    .sort((a, b) => a.percentComplete - b.percentComplete)
    .slice(0, 6);
  for (const m of weakestModules) {
    actions.push({
      id: `module-${m.id}-raise`,
      title: `Raise module completion: ${m.name}`,
      rationale: `Module currently ${m.percentComplete}% (${m.status}). See docs/11_LINEAR_PROJECT_PLAN.md for acceptance criteria.`,
    });
  }

  // Dedup and cap
  const dedup = new Map<string, (typeof actions)[number]>();
  for (const a of actions) dedup.set(a.id, a);
  return Array.from(dedup.values()).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 10);
}

function statusMdFromJson(status: StatusJson): string {
  const lines: string[] = [];
  lines.push('# Kairos Status Snapshot');
  lines.push('');
  lines.push('> Autogenerated by `scripts/generate-status.ts`. Do not edit manually.');
  lines.push('');
  lines.push(`## Overall`);
  lines.push(`- **Completion**: ${status.overall.percentComplete}%`);
  lines.push('');

  lines.push('## Checks');
  lines.push('- **Policy**: Kairos does not run `typecheck/lint/test` by default.');
  lines.push('- **Opt-in**: set `KAIROS_RUN_CHECKS=1` to include summarized check results in `docs/status.json` only.');
  lines.push('');

  lines.push('## Modules');
  for (const m of status.modules) {
    lines.push(`- **${m.name}**: ${m.status} (${m.percentComplete}%)`);
  }
  lines.push('');

  lines.push('## Phases');
  for (const p of status.phases) {
    lines.push(`- **Phase ${p.id}: ${p.title}**: ${p.status} (${p.percentComplete}%)`);
  }
  lines.push('');

  lines.push('## Top 10 Next Actions');
  for (const a of status.topNextActions) {
    lines.push(`- **${a.title}**: ${a.rationale}`);
  }
  lines.push('');

  lines.push('## Top Risks');
  if (status.topRisks.length === 0) {
    lines.push('- **None detected**: No automated risks triggered.');
  } else {
    for (const r of status.topRisks) {
      lines.push(`- **${r.title}** (${r.severity}): ${r.details}`);
    }
  }
  lines.push('');

  lines.push('## Recently Completed');
  lines.push('- **Assumption:** Git history is not scanned by this generator yet. Add a git-log scan if needed.');
  lines.push('');

  lines.push('## Details');
  lines.push('- `docs/status.json` contains the machine-readable breakdown and evidence signals.');
  lines.push('');

  return lines.join('\n');
}

function phaseMapMermaid(phases: DiscoveredPhase[]): string {
  const lines: string[] = [];
  const nodeLines: string[] = [];
  const edgeSet = new Set<string>();

  lines.push('flowchart LR');

  for (const p of phases) {
    const nodeId = `phase${p.id}`;
    const label = `Phase ${p.id}: ${p.title}`;
    nodeLines.push(`  ${nodeId}["${label.replace(/"/g, '\\"')}"]`);
  }

  for (let idx = 0; idx < phases.length - 1; idx++) {
    const a = phases[idx];
    const b = phases[idx + 1];
    edgeSet.add(`  phase${a.id} --> phase${b.id}`);
  }

  for (const p of phases) {
    const deps = (p.dependencies || [])
      .map((d) => {
        const m = d.match(/Phase\s+(\d+)/i);
        return m ? Number(m[1]) : null;
      })
      .filter((n): n is number => n !== null);
    for (const dep of deps) {
      if (phases.find((x) => x.id === dep)) {
        edgeSet.add(`  phase${dep} --> phase${p.id}`);
      }
    }
  }

  nodeLines.sort();
  lines.push(...nodeLines);
  lines.push(...Array.from(edgeSet).sort());
  lines.push('');
  return lines.join('\n');
}

function main() {
  const phasesFromSeed = parseSeedPhases();
  const phasesFromDoc = parsePhaseStatusDoc();

  const rulesPath = path.join(REPO_ROOT, 'firestore.rules');
  const indexesPath = path.join(REPO_ROOT, 'firestore.indexes.json');
  const rulesText = exists(rulesPath) ? readText(rulesPath) : '';
  const indexesJson = parseFirestoreIndexes(indexesPath);

  const inventory = buildRepoInventory();
  const pkg = JSON.parse(readText(path.join(REPO_ROOT, 'package.json')));

  function normalizeOutput(out: string) {
    const root = REPO_ROOT.replace(/\\/g, '/');
    return out
      .replace(/\r\n/g, '\n')
      .replace(/\\/g, '/')
      .split('\n')
      .map((l) => l.replaceAll(root, '<repo>'))
      .slice(0, 120)
      .join('\n');
  }

  function runNpmScript(scriptName: 'typecheck' | 'lint' | 'test') {
    if (process.env.KAIROS_RUN_CHECKS !== '1') return undefined;
    if (!pkg?.scripts?.[scriptName]) return undefined;
    const command = `npm run ${scriptName}`;
    const res = spawnSync(command, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      windowsHide: true,
      shell: true,
    });
    const combined = `${res.stdout || ''}\n${res.stderr || ''}`.trim();
    const normalized = normalizeOutput(res.error ? `${combined}\n${String(res.error)}` : combined);
    const firstMeaningfulLine =
      normalized
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.length > 0 && !l.startsWith('> ')) || undefined;

    return { ok: res.status === 0, exitCode: res.status, command, message: firstMeaningfulLine };
  }

  const checks = {
    typecheck: runNpmScript('typecheck'),
    lint: runNpmScript('lint'),
    test: runNpmScript('test'),
  };

  // Modules
  const modules: StatusJson['modules'] = MODULES.map((m) => {
    const { percent, evaluated } = computePercent(m.signals, { rulesText, indexesJson });
    const status = mapPercentToStatus(percent);
    return {
      id: m.id,
      name: m.name,
      status,
      percentComplete: percent,
      area: m.area,
      evidence: {
        signals: evaluated.map((e) => ({
          id: e.signal.id,
          ok: e.ok,
          weight: e.signal.weight,
          type: e.signal.type,
          details: e.details,
        })),
        whereInCode: m.signals
          .flatMap((s: any) => {
            if (s.type === 'file_exists') return [(s.params as any).path];
            if (s.type === 'glob_exists' || s.type === 'test_exists') return [(s.params as any).glob];
            return [];
          })
          .filter(Boolean)
          .sort(),
        notes: [],
      },
    };
  }).sort((a, b) => a.id.localeCompare(b.id));

  // Phases
  const phaseSignalMap = new Map<number, Signal[]>();
  for (const mapping of PHASE_SIGNAL_MAPPINGS) {
    phaseSignalMap.set(mapping.phaseId, mapping.signals);
  }
  const docMap = new Map<number, PhaseStatusFromDoc>();
  for (const p of phasesFromDoc) docMap.set(p.id, p);

  function phasePercentFromDoc(doc?: PhaseStatusFromDoc): { percent: number; status: KairosStatus; notes: string[] } | null {
    if (!doc) return null;
    const headline = (doc.headline || '').toUpperCase();
    const statusText = (doc.status || '').toUpperCase();
    const notes = (doc.notes || []).slice();

    const isNotImpl = headline.includes('NOT IMPLEMENTED') || statusText.includes('NOT IMPLEMENTED');
    const isPartial = headline.includes('PARTIALLY') || statusText.includes('PARTIALLY');
    const isDone =
      headline.includes('COMPLETED') ||
      headline.includes('DEPLOYED') ||
      headline.includes('INTEGRATED') ||
      headline.includes('LIVE') ||
      ['COMPLETED', 'DEPLOYED', 'INTEGRATED', 'LIVE'].includes(statusText);

    if (isNotImpl) return { percent: 0, status: 'Planned', notes };
    if (isDone) return { percent: 100, status: 'Done', notes };
    if (isPartial) return { percent: 50, status: 'In Progress', notes };

    // Default: the doc says it exists but may not be complete.
    return { percent: 60, status: 'In Progress', notes };
  }

  const phases: StatusJson['phases'] = phasesFromSeed.map((p) => {
    const extraSignals = phaseSignalMap.get(p.id) || [];
    const signalScore = computePercent(extraSignals, { rulesText, indexesJson });
    const doc = docMap.get(p.id);
    const docScore = phasePercentFromDoc(doc);

    let percent =
      docScore && extraSignals.length > 0
        ? Math.max(docScore.percent, signalScore.percent)
        : docScore
          ? docScore.percent
          : extraSignals.length > 0
            ? signalScore.percent
            : 0;

    const status =
      docScore
        ? docScore.status
        : extraSignals.length > 0
          ? mapPercentToStatus(percent)
          : 'Planned';

    // Avoid confusing "In Progress 100%" outputs when the doc says the phase is not fully complete.
    if (status !== 'Done' && percent >= 90) percent = 89;

    const notes: string[] = [];
    if (!doc) notes.push('Assumption: Phase not found in PHASE_IMPLEMENTATION_STATUS.md; using seed-phases as source of truth.');

    const evaluatedSignals =
      extraSignals.length > 0
        ? signalScore.evaluated
        : [];

    return {
      id: p.id,
      title: p.title,
      status,
      percentComplete: percent,
      seededStatus: p.seededStatus,
      statusDocStatus: doc?.status,
      evidence: {
        signals: evaluatedSignals.map((e) => ({
          id: e.signal.id,
          ok: e.ok,
          weight: e.signal.weight,
          type: e.signal.type,
          details: e.details,
        })),
        whereInCode: (doc?.implementationFiles || []).slice().sort(),
        notes: [...(docScore?.notes || []), ...notes].sort(),
      },
    };
  });

  // Detect mismatch: phases in status doc not present in seed list
  const seedIds = new Set(phasesFromSeed.map((p) => p.id));
  const docIds = phasesFromDoc.map((p) => p.id);
  const missingInSeed = docIds.filter((id) => !seedIds.has(id)).sort((a, b) => a - b);
  if (missingInSeed.length > 0) {
    // attach to repo inventory via risks
    inventory.hardcodedFindings.urls = inventory.hardcodedFindings.urls; // no-op, keep deterministic
  }

  const overallPercent =
    modules.length > 0
      ? Math.round(modules.reduce((sum, m) => sum + m.percentComplete, 0) / modules.length)
      : 0;

  const topRisks = buildTopRisks(inventory, rulesText, indexesJson);
  const topNextActions = buildTopNextActions(phases, modules);

  const statusJson: StatusJson = {
    overall: { percentComplete: overallPercent },
    checks,
    phases: phases.slice().sort((a, b) => a.id - b.id),
    modules,
    topNextActions,
    topRisks,
    repoInventory: inventory,
  };

  // Write outputs
  const docsDir = path.join(REPO_ROOT, 'docs');
  ensureDir(docsDir);

  const statusJsonPath = path.join(docsDir, 'status.json');
  const statusMdPath = path.join(docsDir, 'STATUS.md');

  const statusJsonText = JSON.stringify(statusJson, null, 2) + '\n';
  const statusMdText = statusMdFromJson(statusJson) + '\n';

  const wroteJson = writeFileIfChanged(statusJsonPath, statusJsonText);
  const wroteMd = writeFileIfChanged(statusMdPath, statusMdText);

  // Phase map diagram (must be phase-discovered; no hardcoding)
  const diagramsDir = path.join(docsDir, 'diagrams');
  ensureDir(diagramsDir);
  const phaseMapPath = path.join(diagramsDir, 'architecture_phase_map.mmd');
  const phaseMapText = phaseMapMermaid(phasesFromSeed);
  const wrotePhaseMap = writeFileIfChanged(phaseMapPath, phaseMapText);

  console.log(`[kairos] Wrote docs/status.json: ${wroteJson ? 'updated' : 'no-change'}`);
  console.log(`[kairos] Wrote docs/STATUS.md: ${wroteMd ? 'updated' : 'no-change'}`);
  console.log(`[kairos] Wrote docs/diagrams/architecture_phase_map.mmd: ${wrotePhaseMap ? 'updated' : 'no-change'}`);
  console.log(`[kairos] Discovered phases: ${phasesFromSeed.length}`);
  console.log(`[kairos] Modules scored: ${modules.length}`);
}

main();


