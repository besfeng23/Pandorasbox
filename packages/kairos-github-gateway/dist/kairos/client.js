"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKairosClient = createKairosClient;
function trimSlash(s) {
    return s.replace(/\/+$/, '');
}
function resolveUrl(envKey, defaultUrl) {
    const v = (process.env[envKey] ?? '').trim();
    return v || defaultUrl;
}
function createKairosClient(args) {
    const fetchImpl = args?.fetchImpl ?? fetch;
    const base = trimSlash((process.env.KAIROS_BASE_URL ?? '').trim());
    if (!base) {
        throw new Error('Missing required env var: KAIROS_BASE_URL');
    }
    const ingestUrl = resolveUrl('KAIROS_INGEST_EVENT_URL', `${base}/functions/kairosIngestEvent`);
    const recomputeUrl = resolveUrl('KAIROS_RECOMPUTE_URL', `${base}/functions/kairosRecompute`);
    const secret = (process.env.KAIROS_INGEST_SECRET ?? process.env.KAIROS_INGEST_KEY ?? '').trim();
    const headers = {
        'Content-Type': 'application/json',
    };
    if (secret)
        headers.Authorization = `Bearer ${secret}`;
    async function postJson(url, body) {
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
        async ingestEvent(e) {
            await postJson(ingestUrl, e);
        },
        async recomputeFull() {
            await postJson(recomputeUrl, { full: true });
        },
    };
}
