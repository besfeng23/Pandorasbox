import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractConcepts } from '@/lib/knowledge-graph';

describe('knowledge graph extraction', () => {
  it('extracts unique concepts while removing stop words', () => {
    const concepts = extractConcepts('The quick brown fox jumps over the lazy dog and the fox.');

    assert.ok(concepts.includes('quick'));
    assert.ok(concepts.includes('brown'));
    assert.ok(concepts.includes('fox'));
    assert.ok(!concepts.includes('the'));
    assert.ok(!concepts.includes('and'));
  });

  it('returns an empty list for empty input', () => {
    assert.deepEqual(extractConcepts(''), []);
  });
});
