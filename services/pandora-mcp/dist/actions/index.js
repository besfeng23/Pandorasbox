export function createActionRegistry(opts) {
    const { config } = opts;
    return {
        ping: async (_req) => ({ pong: true }),
        'health.check': async (_req) => ({ ok: true }),
        'info.get': async (_req) => ({
            ok: true,
            app_env: process.env.APP_ENV || 'dev',
            version: process.env.npm_package_version || 'unknown',
        }),
        'config.get': async (_req) => ({
            keys: Object.keys(config).sort(),
        }),
    };
}
