import { v4 as uuidv4 } from 'uuid';
import type { McpRequest, McpResponse } from './schemas';

type Handler = (req: McpRequest) => Promise<Record<string, any>>;

export function createRouter(handlers: Record<string, Handler>) {
  return async function route(req: McpRequest): Promise<McpResponse> {
    const start = Date.now();
    const traceId = req.meta.traceId || uuidv4();

    try {
      const handler = handlers[req.action];
      if (!handler) {
        return {
          ok: false,
          result: null,
          error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${req.action}` },
          traceId,
          timingMs: Date.now() - start,
        };
      }

      const result = await handler({ ...req, meta: { ...req.meta, traceId } });
      return {
        ok: true,
        result,
        error: null,
        traceId,
        timingMs: Date.now() - start,
      };
    } catch (err: any) {
      const message = err?.message ? String(err.message) : 'Unhandled error';
      const code = err?.code ? String(err.code) : 'INTERNAL_ERROR';
      return {
        ok: false,
        result: null,
        error: { code, message },
        traceId,
        timingMs: Date.now() - start,
      };
    }
  };
}



