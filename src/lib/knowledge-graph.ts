import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from './firebase-admin';
import {
  buildRelationshipsForConcepts,
  calculateRelationshipStrength,
  RelationshipEdgeInput,
} from './relationship-manager';

export const KNOWLEDGE_NODE_COLLECTION = 'system_knowledge_graph';
export const KNOWLEDGE_EDGE_COLLECTION = 'knowledge_edges';

export type KnowledgeNodeType = 'concept' | 'entity' | 'theme';

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  userId: string;
  type: KnowledgeNodeType;
  memoryIds: string[];
  occurrences: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface KnowledgeGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  userId: string;
  relation: string;
  weight: number;
  memoryIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface KnowledgeGraphSnapshot {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'were',
  'will',
  'with',
  'this',
  'these',
  'those',
  'you',
  'your',
  'i',
  'we',
  'our',
  'they',
  'them',
  'their',
  'or',
  'if',
  'then',
  'than',
  'so',
  'not',
]);

function normalizeConcept(label: string): string {
  return label.trim().toLowerCase();
}

export function extractConcepts(text: string): string[] {
  if (!text) {
    return [];
  }

  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));

  const unique = new Set(tokens);
  return Array.from(unique).sort();
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function buildNodeId(userId: string, label: string): string {
  return `${userId}_${slugify(label)}`;
}

function buildEdgeId(userId: string, sourceId: string, targetId: string): string {
  const [first, second] = [sourceId, targetId].sort();
  return `${userId}_${first}_${second}`;
}

export async function updateKnowledgeGraphFromMemory(params: {
  userId: string;
  memoryId: string;
  content: string;
  type?: KnowledgeNodeType;
}): Promise<KnowledgeGraphSnapshot> {
  const { userId, memoryId, content } = params;

  const concepts = extractConcepts(content);
  if (concepts.length === 0) {
    return { nodes: [], edges: [] };
  }

  const conceptIdLookup = new Map<string, string>();
  const nodes: KnowledgeGraphNode[] = concepts.map(label => {
    const normalized = normalizeConcept(label);
    const id = buildNodeId(userId, normalized);
    conceptIdLookup.set(normalized, id);
    return {
      id,
      label: normalized,
      userId,
      type: params.type ?? 'concept',
      memoryIds: [memoryId],
      occurrences: 1,
    };
  });

  const edgesInput = buildRelationshipsForConcepts(
    concepts.map(normalizeConcept),
    conceptIdLookup,
    userId,
    memoryId,
    { relation: 'co_occurrence' }
  );

  const edges: KnowledgeGraphEdge[] = edgesInput.map(edge => ({
    id: buildEdgeId(userId, edge.sourceId, edge.targetId),
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    userId,
    relation: edge.relation,
    weight: edge.weight,
    memoryIds: [memoryId],
  }));

  const firestoreAdmin = getFirestoreAdmin();
  const batch = firestoreAdmin.batch();

  const nodesCollection = firestoreAdmin.collection(KNOWLEDGE_NODE_COLLECTION);
  const edgesCollection = firestoreAdmin.collection(KNOWLEDGE_EDGE_COLLECTION);

  nodes.forEach(node => {
    const nodeRef = nodesCollection.doc(node.id);
    batch.set(
      nodeRef,
      {
        id: node.id,
        label: node.label,
        userId: node.userId,
        type: node.type,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        occurrences: FieldValue.increment(1),
        memoryIds: FieldValue.arrayUnion(memoryId),
      },
      { merge: true }
    );
  });

  edges.forEach(edge => {
    const edgeRef = edgesCollection.doc(edge.id);
    batch.set(
      edgeRef,
      {
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        userId: edge.userId,
        relation: edge.relation,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        weight: FieldValue.increment(edge.weight),
        memoryIds: FieldValue.arrayUnion(memoryId),
      },
      { merge: true }
    );
  });

  await batch.commit();

  return { nodes, edges };
}

export async function getKnowledgeGraphSnapshot(params: {
  userId: string;
  memoryIds?: string[];
  limit?: number;
}): Promise<KnowledgeGraphSnapshot> {
  const { userId, memoryIds } = params;
  const firestoreAdmin = getFirestoreAdmin();
  const nodesCollection = firestoreAdmin.collection(KNOWLEDGE_NODE_COLLECTION);
  const edgesCollection = firestoreAdmin.collection(KNOWLEDGE_EDGE_COLLECTION);

  const memorySlice = memoryIds?.filter(Boolean).slice(0, 10);

  const nodesQuery = memorySlice && memorySlice.length > 0
    ? nodesCollection
        .where('userId', '==', userId)
        .where('memoryIds', 'array-contains-any', memorySlice)
    : nodesCollection.where('userId', '==', userId);

  const edgesQuery = memorySlice && memorySlice.length > 0
    ? edgesCollection
        .where('userId', '==', userId)
        .where('memoryIds', 'array-contains-any', memorySlice)
    : edgesCollection.where('userId', '==', userId);

  const [nodesSnapshot, edgesSnapshot] = await Promise.all([
    nodesQuery.limit(params.limit ?? 200).get(),
    edgesQuery.limit(params.limit ?? 400).get(),
  ]);

  const nodes = nodesSnapshot.docs.map(doc => doc.data() as KnowledgeGraphNode);
  const edges = edgesSnapshot.docs.map(doc => {
    const data = doc.data() as KnowledgeGraphEdge & { weight?: number; occurrences?: number };
    return {
      ...data,
      weight: calculateRelationshipStrength(data.weight ?? data.occurrences ?? 1),
    };
  });

  return { nodes, edges };
}

export function toRelationshipEdges(edges: KnowledgeGraphEdge[]): RelationshipEdgeInput[] {
  return edges.map(edge => ({
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    userId: edge.userId,
    memoryId: edge.memoryIds?.[0] ?? '',
    relation: edge.relation as RelationshipEdgeInput['relation'],
    weight: edge.weight,
  }));
}
