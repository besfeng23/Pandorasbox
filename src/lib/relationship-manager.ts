'use server';

export type RelationshipType = 'co_occurrence' | 'semantic_association';

export interface RelationshipEdgeInput {
  sourceId: string;
  targetId: string;
  userId: string;
  memoryId: string;
  relation: RelationshipType;
  weight: number;
}

interface BuildRelationshipsOptions {
  relation?: RelationshipType;
  maxEdges?: number;
}

function edgeKey(sourceId: string, targetId: string) {
  return [sourceId, targetId].sort().join('::');
}

export function buildRelationshipsForConcepts(
  concepts: string[],
  conceptIdLookup: Map<string, string>,
  userId: string,
  memoryId: string,
  options: BuildRelationshipsOptions = {}
): RelationshipEdgeInput[] {
  const relation = options.relation ?? 'co_occurrence';
  const maxEdges = options.maxEdges ?? 75;
  const edges: RelationshipEdgeInput[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < concepts.length; i += 1) {
    for (let j = i + 1; j < concepts.length; j += 1) {
      const sourceLabel = concepts[i];
      const targetLabel = concepts[j];
      const sourceId = conceptIdLookup.get(sourceLabel);
      const targetId = conceptIdLookup.get(targetLabel);

      if (!sourceId || !targetId || sourceId === targetId) {
        continue;
      }

      const key = edgeKey(sourceId, targetId);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      edges.push({
        sourceId,
        targetId,
        userId,
        memoryId,
        relation,
        weight: 1,
      });

      if (edges.length >= maxEdges) {
        return edges;
      }
    }
  }

  return edges;
}

export function calculateRelationshipStrength(occurrences: number): number {
  if (occurrences <= 1) {
    return 0.25;
  }

  return Math.min(1, 0.25 + Math.log2(occurrences) * 0.15);
}
