import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { middleware } from '../../../middleware';

function req(url: string, withSession = false) {
  const headers = withSession ? { cookie: 'session=test-session' } : {};
  return new NextRequest(url, { headers });
}

test('middleware redirects unauthenticated protected page to login', () => {
  const response = middleware(req('http://localhost:9002/chat'));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'http://localhost:9002/login?redirect=%2Fchat');
});

test('middleware keeps API routes untouched by matcher logic', () => {
  const response = middleware(req('http://localhost:9002/api/health/inference'));
  assert.equal(response.status, 200);
});

test('middleware redirects authenticated user away from login', () => {
  const response = middleware(req('http://localhost:9002/login', true));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'http://localhost:9002/');
});
