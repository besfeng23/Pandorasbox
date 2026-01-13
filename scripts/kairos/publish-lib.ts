import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type PublishMode = 'stabilization.register';

export type PublishCliOptions = {
  mode: PublishMode;
  dryRun: boolean;
  baseUrl: string;
  contractPath: string;
  ingestKey?: string;
  signingSecret?: string;
  nowIso?: string;
  source?: string;
  stabilizationRegisterUrl?: string;
  stabilizationActiveUrl?: string;
};

export type PublishDiagnostics = {
  resolvedBaseUrl: string;
  resolvedEndpoint: string;
  contractPath: string;
  contractPathRelative: string;
  contractSizeBytes: number;
  contractSha256Hex: string;
  payloadTopLevelKeys: number;
  payloadCounts?: Record<string, number>;
  dryRun: boolean;
};

export class KairosPublishError extends Error {
  public readonly code:
    | 'INVALID_BASE_URL'
    | 'CONTRACT_NOT_FOUND'
    | 'CONTRACT_EMPTY'
    | 'CONTRACT_PARSE_FAILED'
    | 'CONTRACT_INVALID'
    | 'HTTP_ERROR'
    | 'NETWORK_ERROR';

  public readonly details?: Record<string, unknown>;

  constructor(
    code: KairosPublishError['code'],
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export function resolveAndValidateBaseUrl(input: string): URL {
  const trimmed = (input ?? '').trim();
  if (!trimmed) {
    throw new KairosPublishError('INVALID_BASE_URL', 'KAIROS_BASE_URL is empty');
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new KairosPublishError('INVALID_BASE_URL', `Invalid KAIROS_BASE_URL: "${trimmed}"`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new KairosPublishError(
      'INVALID_BASE_URL',
      `Invalid KAIROS_BASE_URL protocol: "${url.protocol}" (must be http/https)`
    );
  }
  return url;
}

export function readFileStrict(filePath: string): { content: string; sizeBytes: number; sha256Hex: string } {
  if (!fs.existsSync(filePath)) {
    throw new KairosPublishError('CONTRACT_NOT_FOUND', `Contract file not found: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new KairosPublishError('CONTRACT_NOT_FOUND', `Contract path is not a file: ${filePath}`);
  }
  if (stat.size <= 0) {
    throw new KairosPublishError('CONTRACT_EMPTY', `Contract file is empty: ${filePath}`);
  }

  const buf = fs.readFileSync(filePath);
  const sha256Hex = crypto.createHash('sha256').update(buf).digest('hex');
  const content = buf.toString('utf8');
  if (!content.trim()) {
    throw new KairosPublishError('CONTRACT_EMPTY', `Contract file is empty/blank: ${filePath}`);
  }
  return { content, sizeBytes: stat.size, sha256Hex };
}

export function parseJsonStrict<T = unknown>(jsonText: string, context: string): T {
  try {
    return JSON.parse(jsonText) as T;
  } catch (err: any) {
    throw new KairosPublishError('CONTRACT_PARSE_FAILED', `Failed to parse JSON (${context}): ${err?.message ?? err}`);
  }
}

export type StabilizationPlanContract = {
  sprintName: string;
  bugClusters: unknown[];
  fixSequence: unknown[];
  gatingRules: unknown[];
  regressionChecklist?: unknown[];
  rollbackStrategy?: unknown;
};

export function validateStabilizationPlanContract(plan: unknown): StabilizationPlanContract {
  if (!plan || typeof plan !== 'object') {
    throw new KairosPublishError('CONTRACT_INVALID', 'Contract JSON must be an object');
  }
  const obj = plan as Record<string, unknown>;
  const required = ['sprintName', 'bugClusters', 'fixSequence', 'gatingRules'] as const;
  const missing = required.filter((k) => !(k in obj));
  if (missing.length > 0) {
    throw new KairosPublishError('CONTRACT_INVALID', `Contract missing required fields: ${missing.join(', ')}`);
  }
  if (typeof obj.sprintName !== 'string' || !obj.sprintName.trim()) {
    throw new KairosPublishError('CONTRACT_INVALID', 'Contract field "sprintName" must be a non-empty string');
  }
  for (const listField of ['bugClusters', 'fixSequence', 'gatingRules'] as const) {
    if (!Array.isArray(obj[listField])) {
      throw new KairosPublishError('CONTRACT_INVALID', `Contract field "${listField}" must be an array`);
    }
  }
  return obj as unknown as StabilizationPlanContract;
}

export function buildStabilizationRegisterPayload(
  plan: StabilizationPlanContract,
  nowIso: string,
  source: string
) {
  return {
    sprintName: plan.sprintName,
    bugClusters: plan.bugClusters,
    fixSequence: plan.fixSequence,
    gatingRules: plan.gatingRules,
    regressionChecklist: plan.regressionChecklist ?? [],
    rollbackStrategy: plan.rollbackStrategy ?? null,
    registeredAt: nowIso,
    source,
  };
}

export function computeDiagnostics(args: {
  repoRoot: string;
  baseUrl: URL;
  contractPath: string;
  contractSizeBytes: number;
  contractSha256Hex: string;
  payload: Record<string, unknown>;
  payloadCounts?: Record<string, number>;
  dryRun: boolean;
  resolvedEndpoint: string;
}): PublishDiagnostics {
  const contractPathRelative = path.relative(args.repoRoot, args.contractPath);
  return {
    resolvedBaseUrl: args.baseUrl.toString().replace(/\/+$/, ''),
    resolvedEndpoint: args.resolvedEndpoint,
    contractPath: args.contractPath,
    contractPathRelative,
    contractSizeBytes: args.contractSizeBytes,
    contractSha256Hex: args.contractSha256Hex,
    payloadTopLevelKeys: Object.keys(args.payload).length,
    payloadCounts: args.payloadCounts,
    dryRun: args.dryRun,
  };
}

export function formatDiagnostics(diag: PublishDiagnostics): string {
  const lines: string[] = [];
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('Kairos Publish Diagnostics');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`resolved base url   : ${diag.resolvedBaseUrl}`);
  lines.push(`resolved endpoint   : ${diag.resolvedEndpoint}`);
  lines.push(`contract (relative) : ${diag.contractPathRelative}`);
  lines.push(`contract (absolute) : ${diag.contractPath}`);
  lines.push(`contract size bytes : ${diag.contractSizeBytes}`);
  lines.push(`contract sha256     : ${diag.contractSha256Hex}`);
  lines.push(`payload keys        : ${diag.payloadTopLevelKeys}`);
  if (diag.payloadCounts && Object.keys(diag.payloadCounts).length > 0) {
    for (const [k, v] of Object.entries(diag.payloadCounts)) {
      lines.push(`payload count       : ${k}=${v}`);
    }
  }
  lines.push(`dry run             : ${diag.dryRun ? 'true' : 'false'}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}

function isRetryableHttpStatus(status: number): boolean {
  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  return false;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: { retries: number; minDelayMs?: number; onAttempt?: (attempt: number, total: number) => void }
): Promise<Response> {
  const retries = Math.max(0, options.retries);
  const totalAttempts = 1 + retries;
  const minDelayMs = options.minDelayMs ?? 250;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    options.onAttempt?.(attempt, totalAttempts);
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;

      // Do not retry 4xx except 429
      if (!isRetryableHttpStatus(res.status)) {
        return res;
      }

      // Retryable (429/5xx). If this was the last attempt, return the response
      // so the caller can surface the exact status/body.
      if (attempt >= totalAttempts) {
        return res;
      }

      lastError = new KairosPublishError('HTTP_ERROR', `HTTP ${res.status}`, { status: res.status });
    } catch (err) {
      lastError = err;
    }

    if (attempt < totalAttempts) {
      const backoff = minDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  throw new KairosPublishError('NETWORK_ERROR', 'Request failed after retries', {
    cause: lastError instanceof Error ? lastError.message : String(lastError),
  });
}

export async function runKairosPublish(
  cli: PublishCliOptions,
  deps?: {
    repoRoot?: string;
    logger?: Pick<Console, 'log' | 'error' | 'warn'>;
    fetchImpl?: typeof fetch;
  }
): Promise<{ ok: true; diagnostics: PublishDiagnostics } | { ok: false; diagnostics?: PublishDiagnostics; error: KairosPublishError }> {
  const logger = deps?.logger ?? console;
  const repoRoot = deps?.repoRoot ?? process.cwd();

  // Allow tests to inject fetch; default to global
  if (deps?.fetchImpl) {
    // @ts-expect-error test injection
    globalThis.fetch = deps.fetchImpl;
  }

  try {
    const baseUrl = resolveAndValidateBaseUrl(cli.baseUrl);

    const contractAbs = path.isAbsolute(cli.contractPath)
      ? cli.contractPath
      : path.join(repoRoot, cli.contractPath);

    const { content, sizeBytes, sha256Hex } = readFileStrict(contractAbs);
    const planJson = parseJsonStrict<unknown>(content, `contract: ${contractAbs}`);
    const plan = validateStabilizationPlanContract(planJson);

    const nowIso = cli.nowIso ?? new Date().toISOString();
    const source = cli.source ?? 'pandorasbox';

    const payload = buildStabilizationRegisterPayload(plan, nowIso, source);

    const explicitEndpoint = (cli.stabilizationRegisterUrl ?? '').trim();
    const endpoint = explicitEndpoint
      ? explicitEndpoint
      : new URL('/functions/kairosRegisterStabilization', baseUrl).toString();

    const diagnostics = computeDiagnostics({
      repoRoot,
      baseUrl,
      contractPath: contractAbs,
      contractSizeBytes: sizeBytes,
      contractSha256Hex: sha256Hex,
      payload,
      payloadCounts: {
        bugClusters: plan.bugClusters.length,
        gatingRules: plan.gatingRules.length,
        fixSequence: plan.fixSequence.length,
      },
      dryRun: cli.dryRun,
      resolvedEndpoint: endpoint,
    });

    logger.log(formatDiagnostics(diagnostics));

    if (cli.dryRun) {
      return { ok: true, diagnostics };
    }

    const body = JSON.stringify(payload);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const ingestKey = (cli.ingestKey ?? '').trim();
    if (ingestKey) {
      headers['Authorization'] = `Bearer ${ingestKey}`;
    }

    const signingSecret = (cli.signingSecret ?? '').trim();
    if (signingSecret) {
      const signature = crypto.createHmac('sha256', signingSecret).update(body, 'utf8').digest('base64');
      headers['X-Signature'] = signature;
    }

    const res = await fetchWithRetry(
      endpoint,
      {
        method: 'POST',
        headers,
        body,
      },
      {
        retries: 3,
        onAttempt: (attempt, total) => {
          logger.log(`📤 Publishing (${attempt}/${total})...`);
        },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const maybeMissingEndpoint =
        res.status === 404 || res.status === 501 || res.status === 405 || res.status === 403;
      const hint = maybeMissingEndpoint
        ? ' (Base44 function endpoint may not be deployed yet: /functions/kairosRegisterStabilization)'
        : '';
      return {
        ok: false,
        diagnostics,
        error: new KairosPublishError(
          'HTTP_ERROR',
          `Publish failed: HTTP ${res.status} ${res.statusText}${hint}${text ? ` - ${text.slice(0, 800)}` : ''}`,
          { status: res.status }
        ),
      };
    }

    return { ok: true, diagnostics };
  } catch (err: any) {
    const known =
      err instanceof KairosPublishError
        ? err
        : new KairosPublishError('NETWORK_ERROR', err?.message ?? String(err));
    logger.error(`❌ ${known.message}`);
    if (known.details) logger.error(JSON.stringify(known.details, null, 2));
    return { ok: false, error: known };
  }
}


