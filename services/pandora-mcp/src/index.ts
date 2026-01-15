import express from 'express';
import { z } from 'zod';
import { McpRequestSchema, McpResponseSchema } from './core/schemas';
import { createRouter } from './core/router';
import { getConfig } from './lib/runtime/secrets';
import { createActionRegistry } from './actions/index';

const PORT = Number(process.env.PORT || 8080);

async function main() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Load config (cached internally); never log values.
  const config = await getConfig();
  const actions = createActionRegistry({ config });
  const route = createRouter(actions as any);

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/info', (_req, res) => {
    res.json({ ok: true, version: process.env.npm_package_version || 'unknown', app_env: process.env.APP_ENV || 'dev' });
  });

  app.post('/mcp', async (req, res) => {
    const start = Date.now();
    let action = 'unknown';
    let traceId = 'unknown';

    try {
      const parsed = McpRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        const errMsg = parsed.error.issues.map((i) => i.message).join('; ');
        const payload = {
          ok: false,
          result: null,
          error: { code: 'INVALID_REQUEST', message: errMsg || 'Invalid request' },
          traceId: req.body?.meta?.traceId || 'unknown',
          timingMs: Date.now() - start,
        };
        // best-effort log
        console.log(JSON.stringify({ traceId: payload.traceId, action: req.body?.action, ok: false, timingMs: payload.timingMs }));
        return res.status(400).json(payload);
      }

      action = parsed.data.action;
      traceId = parsed.data.meta.traceId || 'generated';

      const resp = await route(parsed.data);
      // Validate response shape to keep contract deterministic.
      const validated = McpResponseSchema.parse(resp);

      console.log(JSON.stringify({ traceId: validated.traceId, action, ok: validated.ok, timingMs: validated.timingMs }));
      return res.status(validated.ok ? 200 : 400).json(validated);
    } catch (err: any) {
      const message = err?.message ? String(err.message) : 'Internal error';
      const payload = {
        ok: false,
        result: null,
        error: { code: 'INTERNAL_ERROR', message },
        traceId: traceId === 'generated' ? 'unknown' : traceId,
        timingMs: Date.now() - start,
      };
      console.log(JSON.stringify({ traceId: payload.traceId, action, ok: false, timingMs: payload.timingMs }));
      return res.status(500).json(payload);
    }
  });

  app.listen(PORT, () => {
    console.log(JSON.stringify({ msg: 'pandora-mcp listening', port: PORT, app_env: process.env.APP_ENV || 'dev' }));
  });
}

main().catch((err) => {
  console.error('Failed to start pandora-mcp');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});



