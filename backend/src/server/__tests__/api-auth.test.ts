import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBearerTokenFromHeader, requireCron, userFromClaims } from '@/server/api-auth';

test('parseBearerTokenFromHeader handles valid bearer token', () => {
  assert.equal(parseBearerTokenFromHeader('Bearer abc123'), 'abc123');
});

test('parseBearerTokenFromHeader rejects missing bearer prefix', () => {
  assert.equal(parseBearerTokenFromHeader('abc123'), null);
  assert.equal(parseBearerTokenFromHeader(null), null);
});

test('userFromClaims maps admin claims', () => {
  const user = userFromClaims({ uid: 'u1', email: 'x@y.com', admin: true } as any);
  assert.equal(user.uid, 'u1');
  assert.equal(user.isAdmin, true);
});

test('requireCron validates scheduler bearer secret', () => {
  process.env.CRON_SECRET = 'super-secret';
  const req = {
    headers: new Headers({ authorization: 'Bearer super-secret' }),
  } as any;

  assert.doesNotThrow(() => requireCron(req));
});

test('requireCron rejects invalid secret', () => {
  process.env.CRON_SECRET = 'super-secret';
  const req = {
    headers: new Headers({ authorization: 'Bearer wrong' }),
  } as any;

  assert.throws(() => requireCron(req), /Unauthorized/);
});
