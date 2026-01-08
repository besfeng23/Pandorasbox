import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleKnowledgeGraphRequest } from '@/app/api/system/knowledge/route';

describe('knowledge graph API handler', () => {
  it('returns an error when userId is missing', async () => {
    const result = await handleKnowledgeGraphRequest({
      userId: '',
    });

    assert.ok('error' in result);
  });
});
