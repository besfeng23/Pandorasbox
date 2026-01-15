import type { McpRequest } from '../core/schemas';

export function createActionRegistry(opts: { config: Record<string, string> }) {
  const { config } = opts;

  return {
    ping: async (_req: McpRequest) => ({ pong: true }),
    'health.check': async (_req: McpRequest) => ({ ok: true }),
    'info.get': async (_req: McpRequest) => ({
      ok: true,
      app_env: process.env.APP_ENV || 'dev',
      version: process.env.npm_package_version || 'unknown',
    }),
    'config.get': async (_req: McpRequest) => ({
      keys: Object.keys(config).sort(),
    }),
  } as const;
}



