import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRelationshipsForConcepts } from '@/lib/relationship-manager';

describe('relationship manager', () => {
  it('builds edges between concept pairs', () => {
    const conceptIds = new Map([
      ['alpha', 'node-alpha'],
      ['beta', 'node-beta'],
      ['gamma', 'node-gamma'],
    ]);

    const edges = buildRelationshipsForConcepts(
      ['alpha', 'beta', 'gamma'],
      conceptIds,
      'user-1',
      'memory-1'
    );

    assert.equal(edges.length, 3);
    assert.equal(edges[0].userId, 'user-1');
  });
});
