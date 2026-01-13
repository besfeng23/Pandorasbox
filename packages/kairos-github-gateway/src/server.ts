import express from 'express';
import type { Request, Response } from 'express';
import { verifyGithubWebhookSignature } from './github/verify';
import { parseGithubWebhook } from './github/parse';
import { createKairosClient, type KairosClient } from './kairos/client';
import { createDedupeStore, type DedupeStore } from './utils/dedupe';

type Logger = Pick<Console, 'log' | 'warn' | 'error'>;

function envList(key: string): string[] {
  const v = (process.env[key] ?? '').trim();
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isRepoAllowed(repoFullName: string | null): boolean {
  const allowed = envList('ALLOWED_REPOS');
  if (allowed.length === 0) return true;
  if (!repoFullName) return false;
  return allowed.includes(repoFullName);
}

function getHeader(req: Request, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  if (typeof v === 'string') return v;
  return undefined;
}

export function createApp(args?: { kairos?: KairosClient; dedupe?: DedupeStore; logger?: Logger }) {
  const logger = args?.logger ?? console;
  const dedupe = args?.dedupe ?? createDedupeStore();
  const kairos = args?.kairos ?? createKairosClient();

  const app = express();

  app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

  // IMPORTANT: GitHub signature verification MUST use the raw request body bytes (express.raw on /webhooks/github).
  // Do NOT verify against JSON-parsed body or signature will fail.
  app.post(
    '/webhooks/github',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response): Promise<void> => {
      const secret = (process.env.GITHUB_WEBHOOK_SECRET ?? '').trim();
      const signature = getHeader(req, 'x-hub-signature-256');
      const eventName = getHeader(req, 'x-github-event') ?? '';

      const rawBody = req.body as any;
      const bodyBuf: Buffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody ?? ''), 'utf8');

      const okSig = verifyGithubWebhookSignature({ secret, rawBody: bodyBuf, signature256Header: signature });
      if (!okSig) {
        logger.warn(`github webhook signature mismatch (event=${eventName || 'unknown'})`);
        res.status(401).json({ ok: false, error: 'invalid signature' });
        return;
      }

      let payload: any;
      try {
        payload = JSON.parse(bodyBuf.toString('utf8'));
      } catch (err: any) {
        logger.warn(`invalid json body: ${err?.message ?? String(err)}`);
        res.status(400).json({ ok: false, error: 'invalid json' });
        return;
      }

      const parsed = parseGithubWebhook({ eventName, payload });
      for (const msg of parsed.logs) logger.log(`[github] ${msg}`);

      if (!isRepoAllowed(parsed.repoFullName)) {
        logger.log(`repo not allowed; skipping: ${parsed.repoFullName ?? 'unknown'}`);
        res.status(202).json({ ok: true, skipped: true, reason: 'repo_not_allowed' });
        return;
      }

      if (parsed.events.length === 0) {
        res.status(200).json({ ok: true, ingested: 0, recompute: false });
        return;
      }

      try {
        let sent = 0;
        for (const e of parsed.events) {
          const dk = String(e?.payload?.dedupe_key ?? '');
          if (!dk) {
            logger.warn(`missing dedupe_key; skipping event ${e.event_type} node=${e.node_id}`);
            continue;
          }
          const dup = await dedupe.isDuplicateAndRecord(dk).catch((err: any) => {
            logger.error(`dedupe error; treating as not-duplicate: ${err?.message ?? String(err)}`);
            return false;
          });
          if (dup) {
            logger.log(`dedupe hit; skipping: ${dk}`);
            continue;
          }

          await kairos.ingestEvent(e);
          sent++;
        }

        if (sent > 0) {
          await kairos.recomputeFull();
        }

        res.status(200).json({ ok: true, ingested: sent, recompute: sent > 0 });
      } catch (err: any) {
        // Hard requirement: gateway must not crash on upstream Kairos errors.
        const msg = err?.message ?? String(err);
        logger.error(`kairos upstream error: ${msg}`);
        res.status(502).json({
          ok: false,
          error: 'kairos_upstream_error',
          message: msg,
        });
      }
    }
  );

  return app;
}

export async function main() {
  const port = Number(process.env.PORT ?? '8080');
  const app = createApp();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`kairos-github-gateway listening on :${port}`);
  });
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}


