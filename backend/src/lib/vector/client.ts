'use server';

import 'server-only';
import { qdrantClient } from '@/lib/vector/qdrant-client';
import type { QdrantClient } from '@qdrant/js-client-rest';
// PointStruct type definition
type PointStruct = {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
};

type ScoredPoint = {
  id: string | number;
  version?: number;
  score: number;
  payload?: Record<string, unknown> | { [key: string]: unknown } | null;
  vector?: number[] | Record<string, unknown> | number[][] | null;
  shard_key?: string | number | null;
  order_value?: number | null;
};

/**
 * Memory collection configuration constants
 */
export const MEMORY_COLLECTION = 'user_memory';
export const VECTOR_SIZE = 1536; // Standard for most modern large embedding models
export const DISTANCE_METRIC = 'Cosine' as const;

let collectionInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Get the Qdrant client singleton instance
 * @returns The QdrantClient instance
 */
function getClient(): QdrantClient {
  return qdrantClient;
}

/**
 * Idempotent collection initialization
 * Checks if the memory collection exists, and creates it if it doesn't
 * This function is safe to call multiple times
 */
export async function initializeQdrantCollection(): Promise<void> {
  // If already initialized, return immediately
  if (collectionInitialized) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      const client = getClient();

      // Check if collection exists
      const collections = await client.getCollections();
      const collectionExists = collections.collections.some(
        (collection) => collection.name === MEMORY_COLLECTION
      );

      if (collectionExists) {
        console.log(`[Vector Client] Collection '${MEMORY_COLLECTION}' already exists.`);
        collectionInitialized = true;
        return;
      }

      // Create the collection if it doesn't exist
      console.log(`[Vector Client] Creating collection '${MEMORY_COLLECTION}'...`);
      await client.createCollection(MEMORY_COLLECTION, {
        vectors: {
          size: VECTOR_SIZE,
          distance: DISTANCE_METRIC,
        },
      });

      console.log(`[Vector Client] Collection '${MEMORY_COLLECTION}' created successfully.`);
      collectionInitialized = true;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Vector Client] Failed to initialize collection: ${errorMessage}`);
      throw new Error(`Failed to initialize Qdrant collection: ${errorMessage}`);
    } finally {
      // Clear the promise so we can retry if needed
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * Upsert memory points into the Qdrant collection
 * Automatically merges userId into each point's payload for filtering
 * @param userId The user ID to filter by
 * @param points Array of PointStruct points to upsert
 */
export async function upsertMemoryPoints(
  userId: string,
  points: PointStruct[]
): Promise<void> {
  try {
    // Ensure collection is initialized
    await initializeQdrantCollection();

    const client = getClient();

    // Merge userId into each point's payload
    const pointsWithUserId = points.map((point) => ({
      ...point,
      payload: {
        ...point.payload,
        userId: userId,
      },
    }));

    // Batch upsert points
    await client.upsert(MEMORY_COLLECTION, {
      wait: true,
      points: pointsWithUserId,
    });

    console.log(
      `[Vector Client] Successfully upserted ${points.length} point(s) for user ${userId}`
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Vector Client] Failed to upsert memory points: ${errorMessage}`);
    throw new Error(`Failed to upsert memory points: ${errorMessage}`);
  }
}

/**
 * Search memory points in the Qdrant collection
 * Results are filtered by userId to ensure multi-tenant isolation
 * @param userId The user ID to filter by
 * @param vector The query vector to search with
 * @param limit Maximum number of results to return (default: 5)
 * @returns Array of ScoredPoint results filtered by userId
 */
export async function searchMemory(
  userId: string,
  vector: number[],
  limit: number = 5
): Promise<ScoredPoint[]> {
  try {
    // Ensure collection is initialized
    await initializeQdrantCollection();

    const client = getClient();

    // Perform vector search with userId filter
    // Qdrant filter syntax: use FilterCondition with must clause
    const searchResult = await client.search(MEMORY_COLLECTION, {
      vector,
      limit,
      filter: {
        must: [
          {
            key: 'userId',
            match: {
              value: userId,
            },
          },
        ],
      } as any, // Type assertion for filter structure
      with_payload: true,
      with_vector: false, // Don't return vectors in results to save bandwidth
    });

    console.log(
      `[Vector Client] Search returned ${searchResult.length} result(s) for user ${userId}`
    );

    return searchResult as ScoredPoint[];
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Vector Client] Failed to search memory: ${errorMessage}`);
    throw new Error(`Failed to search memory: ${errorMessage}`);
  }
}

