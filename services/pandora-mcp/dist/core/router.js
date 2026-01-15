import { v4 as uuidv4 } from 'uuid';
export function createRouter(handlers) {
    return async function route(req) {
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
        }
        catch (err) {
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
