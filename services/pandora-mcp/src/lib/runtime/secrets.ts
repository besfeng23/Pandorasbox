import { z } from 'zod';

const EnvConfigSchema = z.record(z.string(), z.string());

type Cached = {
  fetchedAtMs: number;
  data: Record<string, string>;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: Cached | null = null;

function envFallback(): Record<string, string> {
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

  const headers: Record<string, string> = { Accept: 'application/json' };
  const bearer = process.env.CLOUDRUN_SECRETS_BEARER?.trim();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) throw new Error(`Secrets URL fetch failed: HTTP ${res.status}`);

  const json = await res.json();
  const parsed = EnvConfigSchema.safeParse(json);
  if (!parsed.success) throw new Error('Secrets URL config is not a string:string object');
  return parsed.data;
}

export async function getConfig(): Promise<Record<string, string>> {
  if (cached && Date.now() - cached.fetchedAtMs < CACHE_TTL_MS) return cached.data;

  try {
    const remote = await fetchSecretsUrlConfig();
    if (remote) {
      cached = { fetchedAtMs: Date.now(), data: remote };
      return remote;
    }
  } catch {
    // silent fallback
  }

  const env = envFallback();
  cached = { fetchedAtMs: Date.now(), data: env };
  return env;
}



