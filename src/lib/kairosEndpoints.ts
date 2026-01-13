/**
 * Kairos endpoint resolution (Base44 function endpoints + env overrides)
 *
 * Source of truth (Base44 Kairos *functions*, not /api routes):
 * - Plan register:    /functions/kairosRegisterPlan
 * - Active plan:      /functions/kairosGetActivePlan
 * - Events ingest:    /functions/ingest
 * - Rollup recompute: /functions/kairosRecompute
 *
 * Track B (stabilization) defaults:
 * - /functions/kairosRegisterStabilization
 * - /functions/kairosGetActiveStabilization
 */

export type KairosResolvedEndpoints = {
  baseUrl: string;
  planRegisterUrl: string;
  activePlanUrl: string;
  ingestUrl: string;
  recomputeUrl: string;
  stabilizationRegisterUrl: string;
  stabilizationActiveUrl: string;
};

const DEFAULT_BASE_URL = 'https://kairostrack.base44.app';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolveBaseUrl(env: NodeJS.ProcessEnv): string {
  const base = (env.KAIROS_BASE_URL || DEFAULT_BASE_URL).trim();
  return trimTrailingSlash(base);
}

function resolveUrlFromEnvOrBase(args: {
  env: NodeJS.ProcessEnv;
  envKey: string;
  baseUrl: string;
  path: string; // must start with /
}): string {
  const explicit = (args.env[args.envKey] || '').trim();
  if (explicit) return explicit;
  return `${args.baseUrl}${args.path}`;
}

/**
 * Resolve Kairos endpoints with these precedence rules:
 * 1) Per-endpoint env vars (e.g. KAIROS_INGEST_URL)
 * 2) If only KAIROS_BASE_URL is set, derive `${KAIROS_BASE_URL}/functions/...`
 * 3) If nothing is set, default to `https://kairostrack.base44.app/functions/...`
 */
export function resolveKairosEndpoints(env: NodeJS.ProcessEnv = process.env): KairosResolvedEndpoints {
  const baseUrl = resolveBaseUrl(env);

  return {
    baseUrl,
    planRegisterUrl: resolveUrlFromEnvOrBase({
      env,
      envKey: 'KAIROS_PLAN_REGISTER_URL',
      baseUrl,
      path: '/functions/kairosRegisterPlan',
    }),
    activePlanUrl: resolveUrlFromEnvOrBase({
      env,
      envKey: 'KAIROS_ACTIVE_PLAN_URL',
      baseUrl,
      path: '/functions/kairosGetActivePlan',
    }),
    ingestUrl: resolveUrlFromEnvOrBase({
      env,
      envKey: 'KAIROS_INGEST_URL',
      baseUrl,
      path: '/functions/ingest',
    }),
    recomputeUrl: resolveUrlFromEnvOrBase({
      env,
      envKey: 'KAIROS_RECOMPUTE_URL',
      baseUrl,
      path: '/functions/kairosRecompute',
    }),
    stabilizationRegisterUrl: resolveUrlFromEnvOrBase({
      env,
      envKey: 'KAIROS_STABILIZATION_REGISTER_URL',
      baseUrl,
      path: '/functions/kairosRegisterStabilization',
    }),
    stabilizationActiveUrl: resolveUrlFromEnvOrBase({
      env,
      envKey: 'KAIROS_STABILIZATION_ACTIVE_URL',
      baseUrl,
      path: '/functions/kairosGetActiveStabilization',
    }),
  };
}


