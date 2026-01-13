import request from 'supertest';
import { computeGithubSignature256 } from '../src/github/verify';
import { createApp } from '../src/server';
import type { KairosClient, KairosEvidenceEvent } from '../src/kairos/client';

function makeMockKairos(): { client: KairosClient; ingested: KairosEvidenceEvent[]; recomputeFull: jest.Mock } {
  const ingested: KairosEvidenceEvent[] = [];
  const recomputeFull = jest.fn(async () => {});
  const client: KairosClient = {
    async ingestEvent(e) {
      ingested.push(e);
    },
    recomputeFull,
  };
  return { client, ingested, recomputeFull };
}

describe('integration: /webhooks/github', () => {
  test('valid signature -> emits to Kairos once, dedupes repeat, recompute once', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'whsec_test';
    process.env.ALLOWED_REPOS = 'acme/widgets';

    // Simple in-memory deduper
    const seen = new Set<string>();
    const dedupe = {
      async isDuplicateAndRecord(key: string) {
        if (seen.has(key)) return true;
        seen.add(key);
        return false;
      },
    };

    const mock = makeMockKairos();
    const app = createApp({ kairos: mock.client, dedupe, logger: { log() {}, warn() {}, error() {} } });

    const payload = {
      action: 'opened',
      repository: { full_name: 'acme/widgets' },
      pull_request: {
        number: 12,
        title: 'PB-CORE-CHAT-001 Implement chat core',
        body: '',
        html_url: 'https://github.com/acme/widgets/pull/12',
        head: { ref: 'feature/PB-CORE-CHAT-001', sha: 'abc123' },
        created_at: '2026-01-13T00:00:00Z',
        updated_at: '2026-01-13T00:00:01Z',
      },
    };
    const rawText = JSON.stringify(payload);
    const raw = Buffer.from(rawText, 'utf8');
    const sig = computeGithubSignature256(process.env.GITHUB_WEBHOOK_SECRET, raw);

    const headers = {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'pull_request',
      'X-Hub-Signature-256': sig,
    };

    const r1 = await request(app).post('/webhooks/github').set(headers).send(rawText);
    expect(r1.status).toBe(200);
    expect(mock.ingested).toHaveLength(1);
    expect(mock.ingested[0].event_type).toBe('github.pr.opened');
    expect(mock.recomputeFull).toHaveBeenCalledTimes(1);

    const r2 = await request(app).post('/webhooks/github').set(headers).send(rawText);
    expect(r2.status).toBe(200);
    // still only 1 ingested due to dedupe
    expect(mock.ingested).toHaveLength(1);
    expect(mock.recomputeFull).toHaveBeenCalledTimes(1);
  });

  test('invalid signature -> 401', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'whsec_test';
    const mock = makeMockKairos();
    const app = createApp({ kairos: mock.client, dedupe: { async isDuplicateAndRecord() { return false; } }, logger: { log() {}, warn() {}, error() {} } });

    const payload = { hello: 'world' };
    const raw = Buffer.from(JSON.stringify(payload), 'utf8');

    const r = await request(app)
      .post('/webhooks/github')
      .set({
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'ping',
        'X-Hub-Signature-256': 'sha256=' + '0'.repeat(64),
      })
      .send(raw);

    expect(r.status).toBe(401);
    expect(mock.ingested).toHaveLength(0);
  });

  test('Kairos upstream error -> 502 (gateway does not crash)', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'whsec_test';
    process.env.ALLOWED_REPOS = 'acme/widgets';

    const kairos = {
      async ingestEvent() {
        throw new Error('Kairos request failed: 500 Internal Server Error url=... body=KeyError');
      },
      async recomputeFull() {},
    };

    const app = createApp({
      // Minimal mock
      kairos: kairos as any,
      dedupe: { async isDuplicateAndRecord() { return false; } },
      logger: { log() {}, warn() {}, error() {} },
    });

    const payload = {
      action: 'opened',
      repository: { full_name: 'acme/widgets' },
      pull_request: {
        number: 12,
        title: 'PB-CORE-CHAT-001 Example',
        body: '',
        html_url: 'https://github.com/acme/widgets/pull/12',
        head: { ref: 'feature/PB-CORE-CHAT-001', sha: 'abc123' },
        created_at: '2026-01-13T00:00:00Z',
        updated_at: '2026-01-13T00:00:01Z',
      },
    };

    const rawText = JSON.stringify(payload);
    const raw = Buffer.from(rawText, 'utf8');
    const sig = computeGithubSignature256(process.env.GITHUB_WEBHOOK_SECRET, raw);

    const r = await request(app)
      .post('/webhooks/github')
      .set({
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'pull_request',
        'X-Hub-Signature-256': sig,
      })
      .send(rawText);

    expect(r.status).toBe(502);
    expect(r.body?.error).toBe('kairos_upstream_error');
  });
});


