import { getConfig, getSecret, _unsafeResetSecretsCacheForTests } from '@/lib/runtime/secrets';

describe('runtime secrets loader', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    _unsafeResetSecretsCacheForTests();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('falls back to process.env when CLOUDRUN_SECRETS_BASE_URL is not set', async () => {
    delete process.env.CLOUDRUN_SECRETS_BASE_URL;
    process.env.APP_ENV = 'dev';
    process.env.FOO = 'bar';

    const cfg = await getConfig();
    expect(cfg.FOO).toBe('bar');
    expect(await getSecret('FOO')).toBe('bar');
  });

  test('fetches from secrets URL and caches for subsequent calls', async () => {
    process.env.CLOUDRUN_SECRETS_BASE_URL = 'https://secrets.example.com';
    process.env.APP_ENV = 'staging';

    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ A: '1', B: '2' }),
    })) as any;
    // @ts-expect-error test mock
    global.fetch = fetchMock;

    const cfg1 = await getConfig();
    const cfg2 = await getConfig();

    expect(cfg1).toEqual({ A: '1', B: '2' });
    expect(cfg2).toEqual({ A: '1', B: '2' });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [calledUrl] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).toBe('https://secrets.example.com/pandorasbox/staging.json');
  });
});


