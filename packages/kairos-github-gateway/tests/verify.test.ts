import { computeGithubSignature256, verifyGithubWebhookSignature } from '../src/github/verify';

describe('GitHub webhook signature verification (raw body)', () => {
  test('passes with known secret + raw body', () => {
    const secret = 'test_secret_123';
    const raw = Buffer.from(JSON.stringify({ hello: 'world' }), 'utf8');
    const sig = computeGithubSignature256(secret, raw);

    const ok = verifyGithubWebhookSignature({
      secret,
      rawBody: raw,
      signature256Header: sig,
    });

    expect(ok).toBe(true);
  });

  test('fails when body changes (classic silent-break bug)', () => {
    const secret = 'test_secret_123';
    const raw = Buffer.from(JSON.stringify({ hello: 'world' }), 'utf8');
    const sig = computeGithubSignature256(secret, raw);

    const changed = Buffer.from(JSON.stringify({ hello: 'WORLD' }), 'utf8');
    const ok = verifyGithubWebhookSignature({
      secret,
      rawBody: changed,
      signature256Header: sig,
    });

    expect(ok).toBe(false);
  });
});


