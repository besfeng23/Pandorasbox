import { z } from 'zod';

const EnvConfigSchema = z.record(z.string(), z.string());

type Cached = {
  fetchedAtMs: number;
  data: Record<string, string>;
  source: 'secrets_url' | 'env';
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: Cached | null = null;

function nowMs() {
  return Date.now();
}

function envFallback(): Record<string, string> {
  // Only include string values; NEVER log values.
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

async function fetchSecretsUrlConfig(): Promise<Record<string, string> | null> {
  const baseUrl = process.env.CLOUDRUN_SECRETS_BASE_URL?.trim();
  if (!baseUrl) return null;

  const appEnv = (process.env.APP_ENV || 'dev').trim();
  const url = `${baseUrl.replace(/\/+$/, '')}/pandorasbox/${encodeURIComponent(appEnv)}.json`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const bearer = process.env.CLOUDRUN_SECRETS_BEARER?.trim();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    // Don't include body in logs; could contain secrets.
    throw new Error(`Secrets URL fetch failed: HTTP ${res.status}`);
  }

  const json = await res.json();
  // Allow unknown JSON but require string->string after parse.
  const parsed = EnvConfigSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('Secrets URL config is not a string:string object');
  }
  return parsed.data;
}

/**
 * Get runtime config as key/value strings.
 * Rules:
 * - Prefer Cloud Run Secrets URL JSON when configured
 * - Cache for 5 minutes in-memory
 * - Fallback to process.env
 * - NEVER log secret values
 */
export async function getConfig(): Promise<Record<string, string>> {
  if (cached && nowMs() - cached.fetchedAtMs < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const remote = await fetchSecretsUrlConfig();
    if (remote) {
      cached = { fetchedAtMs: nowMs(), data: remote, source: 'secrets_url' };
      return remote;
    }
  } catch {
    // Silent fallback to env (no secrets in logs).
  }

  const env = envFallback();
  cached = { fetchedAtMs: nowMs(), data: env, source: 'env' };
  return env;
}

export async function getSecret(key: string): Promise<string | undefined> {
  const cfg = await getConfig();
  if (cfg[key] !== undefined) return cfg[key];
  return process.env[key];
}

export function _unsafeResetSecretsCacheForTests() {
  cached = null;
}


