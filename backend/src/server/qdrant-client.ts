'use server';

import 'server-only';
import { getServerConfig } from './config';
import type { AgentId } from '@/lib/agent-types';

let clientInitialized = false;
let initPromise: Promise<void> | null = null;

function getCollectionName(agentId: AgentId): string {
  return `memories__${agentId}`;
}

async function qdrantRequest(path: string, options: RequestInit = {}): Promise<any> {
  const config = await getServerConfig();
  const url = `${config.qdrantUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qdrant request failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function ensureCollectionsInitialized(): Promise<void> {
  if (clientInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const config = await getServerConfig();
    const dimension = config.embeddingsDimension;

    for (const agentId of ['builder', 'universe'] as AgentId[]) {
      const collectionName = getCollectionName(agentId);

      try {
        await qdrantRequest(`/collections/${collectionName}`);
        console.log(`Collection ${collectionName} exists`);
      } catch (e: any) {
        if (e.message?.includes('404') || e.message?.includes('not found')) {
          console.log(`Creating collection ${collectionName}`);
          await qdrantRequest(`/collections/${collectionName}`, {
            method: 'PUT',
            body: JSON.stringify({
              vectors: {
                size: dimension,
                distance: 'Cosine',
              },
            }),
          });

          // Create payload index for uid and agentId filtering
          await qdrantRequest(`/collections/${collectionName}/index`, {
            method: 'PUT',
            body: JSON.stringify({
              field_name: 'uid',
              field_schema: 'keyword',
            }),
          });

          await qdrantRequest(`/collections/${collectionName}/index`, {
            method: 'PUT',
            body: JSON.stringify({
              field_name: 'agentId',
              field_schema: 'keyword',
            }),
          });
        } else {
          throw e;
        }
      }
    }

    clientInitialized = true;
  })();

  return initPromise;
}

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: {
    uid: string;
    agentId: AgentId;
    content: string;
    createdAt: string;
    source?: string;
    type?: string;
    [key: string]: any;
  };
}

export async function upsertPoints(agentId: AgentId, points: VectorPoint[]): Promise<void> {
  await ensureCollectionsInitialized();
  const collectionName = getCollectionName(agentId);

  await qdrantRequest(`/collections/${collectionName}/points`, {
    method: 'PUT',
    body: JSON.stringify({
      points: points.map(p => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    }),
  });
}

export interface SearchResult {
  id: string;
  score: number;
  payload: VectorPoint['payload'];
}

export async function searchPoints(
  agentId: AgentId,
  vector: number[],
  uid: string,
  limit: number = 10,
): Promise<SearchResult[]> {
  await ensureCollectionsInitialized();
  const collectionName = getCollectionName(agentId);

  const result = await qdrantRequest(`/collections/${collectionName}/points/search`, {
    method: 'POST',
    body: JSON.stringify({
      vector,
      limit,
      with_payload: true,
      filter: {
        must: [
          { key: 'uid', match: { value: uid } },
          { key: 'agentId', match: { value: agentId } },
        ],
      },
    }),
  });

  return result.result.map((r: any) => ({
    id: r.id,
    score: r.score,
    payload: r.payload,
  }));
}

export async function deletePoints(agentId: AgentId, uid: string): Promise<void> {
  await ensureCollectionsInitialized();
  const collectionName = getCollectionName(agentId);

  await qdrantRequest(`/collections/${collectionName}/points/delete`, {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        must: [
          { key: 'uid', match: { value: uid } },
          { key: 'agentId', match: { value: agentId } },
        ],
      },
    }),
  });
}
