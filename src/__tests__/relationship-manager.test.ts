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

    expect(edges.length).toBe(3);
    expect(edges[0].userId).toBe('user-1');
  });
});
