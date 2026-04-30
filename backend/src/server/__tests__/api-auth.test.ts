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

test('userFromClaims maps platform admin claims', () => {
  const user = userFromClaims({ uid: 'u3', email: 'x@y.com', platformRole: 'superadmin' } as any);
  assert.equal(user.isAdmin, true);
});

test('userFromClaims rejects non-admin users', () => {
  const user = userFromClaims({ uid: 'u2', email: 'x@y.com', admin: false } as any);
  assert.equal(user.isAdmin, false);
});

test('requireCron validates scheduler bearer secret', () => {
  process.env.CRON_SECRET = 'super-secret';
  const req = {
    headers: new Headers({ authorization: 'Bearer super-secret' }),
  } as any;

  assert.doesNotThrow(() => requireCron(req));
});

test('requireCron validates x-cron-secret header', () => {
  process.env.CRON_SECRET = 'super-secret';
  const req = {
    headers: new Headers({ 'x-cron-secret': 'super-secret' }),
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

test('requireCron rejects when secret is missing', () => {
  delete process.env.CRON_SECRET;
  const req = {
    headers: new Headers({ authorization: 'Bearer anything' }),
  } as any;

  assert.throws(() => requireCron(req), /Cron secret not configured/);
});
