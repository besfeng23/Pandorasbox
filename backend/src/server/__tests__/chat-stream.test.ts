import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChatStreamLine } from '../../components/chat/stream-utils';

test('parseChatStreamLine parses string text delta lines', () => {
  assert.deepEqual(parseChatStreamLine('0:"Hello"'), { type: 'text', text: 'Hello', rawType: '0' });
});

test('parseChatStreamLine parses object text delta lines', () => {
  assert.deepEqual(parseChatStreamLine('0:{"text":"Hello"}'), { type: 'text', text: 'Hello', rawType: '0' });
  assert.deepEqual(parseChatStreamLine('0:{"content":" world"}'), { type: 'text', text: ' world', rawType: '0' });
});

test('parseChatStreamLine falls back to raw text for non-json text deltas', () => {
  assert.deepEqual(parseChatStreamLine('0:Hello'), { type: 'text', text: 'Hello', rawType: '0' });
});

test('parseChatStreamLine parses tool/data payload lines', () => {
  assert.deepEqual(parseChatStreamLine('2:{"tool":"search","status":"done"}'), {
    type: 'data',
    payload: { tool: 'search', status: 'done' },
    rawType: '2',
  });
});

test('parseChatStreamLine ignores blank and malformed lines', () => {
  assert.equal(parseChatStreamLine(''), null);
  assert.equal(parseChatStreamLine('not-a-stream-line'), null);
});
