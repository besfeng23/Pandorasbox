import { extractConcepts } from '@/lib/knowledge-graph';

describe('knowledge graph extraction', () => {
  it('extracts unique concepts while removing stop words', () => {
    const concepts = extractConcepts('The quick brown fox jumps over the lazy dog and the fox.');

    expect(concepts).toContain('quick');
    expect(concepts).toContain('brown');
    expect(concepts).toContain('fox');
    expect(concepts).not.toContain('the');
    expect(concepts).not.toContain('and');
  });

  it('returns an empty list for empty input', () => {
    expect(extractConcepts('')).toEqual([]);
  });
});
