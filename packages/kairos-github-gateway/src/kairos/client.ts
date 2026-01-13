export type KairosEvidenceEvent = {
  event_time: string;
  event_type:
    | 'github.pr.opened'
    | 'github.pr.merged'
    | 'github.workflow.lint_pass'
    | 'github.workflow.unit_pass'
    | 'github.workflow.integration_pass'
    | 'github.workflow.e2e_pass'
    | 'github.release.published'
    | 'github.deploy.preview_success'
    | 'github.deploy.prod_success';
  actor: 'github';
  source: 'github';
  node_id: string;
  confidence: number;
  payload: Record<string, any>;
};

export type KairosClient = {
  ingestEvent(e: KairosEvidenceEvent): Promise<void>;
  recomputeFull(): Promise<void>;
};

function trimSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

function resolveUrl(envKey: string, defaultUrl: string): string {
  const v = (process.env[envKey] ?? '').trim();
  return v || defaultUrl;
}

export function createKairosClient(args?: { fetchImpl?: typeof fetch }): KairosClient {
  const fetchImpl = args?.fetchImpl ?? fetch;

  const base = trimSlash((process.env.KAIROS_BASE_URL ?? '').trim());
  if (!base) {
    throw new Error('Missing required env var: KAIROS_BASE_URL');
  }

  const ingestUrl = resolveUrl('KAIROS_INGEST_EVENT_URL', `${base}/functions/kairosIngestEvent`);
  const recomputeUrl = resolveUrl('KAIROS_RECOMPUTE_URL', `${base}/functions/kairosRecompute`);

  const secret = (process.env.KAIROS_INGEST_SECRET ?? process.env.KAIROS_INGEST_KEY ?? '').trim();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (secret) headers.Authorization = `Bearer ${secret}`;

  async function postJson(url: string, body: any): Promise<void> {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Kairos request failed: ${res.status} ${res.statusText} url=${url} body=${txt.slice(0, 1200)}`);
    }
  }

  return {
    async ingestEvent(e: KairosEvidenceEvent) {
      await postJson(ingestUrl, e);
    },
    async recomputeFull() {
      await postJson(recomputeUrl, { full: true });
    },
  };
}


