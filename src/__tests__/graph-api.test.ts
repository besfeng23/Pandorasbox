/**
 * @jest-environment node
 */

import { handleKnowledgeGraphRequest } from '@/app/api/system/knowledge/route';

describe('knowledge graph API handler', () => {
  it('returns an error when userId is missing', async () => {
    const result = await handleKnowledgeGraphRequest({
      userId: '',
    });

    expect(result).toHaveProperty('error');
  });
});
