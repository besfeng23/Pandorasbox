import { z } from 'zod';
export const McpRequestSchema = z.object({
    action: z.string().min(1),
    input: z.record(z.any()).default({}),
    context: z
        .object({
        userId: z.string().optional(),
        sessionId: z.string().optional(),
        roles: z.array(z.string()).default([]),
        source: z.string().optional(),
    })
        .default({ roles: [] }),
    meta: z.object({
        traceId: z.string().optional(),
        client: z.string().optional(),
        timestamp: z.number().optional(),
    }),
});
export const McpErrorSchema = z.object({
    code: z.string(),
    message: z.string(),
});
export const McpResponseSchema = z.object({
    ok: z.boolean(),
    result: z.record(z.any()).nullable(),
    error: McpErrorSchema.nullable(),
    traceId: z.string(),
    timingMs: z.number(),
});
