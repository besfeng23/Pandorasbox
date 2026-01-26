'use server';

import 'server-only';
import { QdrantClient } from '@qdrant/qdrant-js';

/**
 * PointStruct type definition for Qdrant points
 * Represents a point with an ID, vector, and optional payload
 */
export type PointStruct = {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
};

/**
 * ScoredPoint type definition for Qdrant search results
 * Represents a point with a similarity score from a search operation
 */
export type ScoredPoint = {
  id: string | number;
  version?: number;
  score: number;
  payload?: Record<string, unknown> | { [key: string]: unknown } | null;
  vector?: number[] | Record<string, unknown> | number[][] | null;
  shard_key?: string | number | null;
  order_value?: number | null;
};

/**
 * Filter type definition for Qdrant search filters
 * Used to filter search results based on payload conditions
 */
export type Filter = {
  must?: Array<{
    key: string;
    match?: { value: string | number | boolean };
    range?: { [key: string]: { gte?: number; lte?: number; gt?: number; lt?: number } };
    [key: string]: any;
  }>;
  should?: Array<any>;
  must_not?: Array<any>;
  [key: string]: any;
};

/**
 * Global type declaration for Next.js hot-reload support
 * This ensures the singleton instance persists across hot-reloads
 */
declare global {
  // eslint-disable-next-line no-var
  var __qdrantVectorClient: QdrantClient | undefined;
}

/**
 * Get Qdrant URL from environment variables
 * @returns The Qdrant service URL
 * @throws Error if QDRANT_URL is not set
 */
function getQdrantUrl(): string {
  const qdrantUrl = process.env.QDRANT_URL;

  if (!qdrantUrl) {
    throw new Error(
      'QDRANT_URL environment variable is required. Please set it in your .env.local file (e.g., QDRANT_URL=http://localhost:6333).'
    );
  }

  // Validate URL format
  try {
    new URL(qdrantUrl);
  } catch (error) {
    throw new Error(
      `Invalid QDRANT_URL format. Expected format: "http://host:port" or "https://host:port". Received: ${qdrantUrl}`
    );
  }

  return qdrantUrl;
}

/**
 * Get Qdrant API key from environment variables
 * @returns The Qdrant API key
 * @throws Error if QDRANT_API_KEY is not set
 */
function getQdrantApiKey(): string {
  const apiKey = process.env.QDRANT_API_KEY;

  if (!apiKey) {
    throw new Error(
      'QDRANT_API_KEY environment variable is required. Please set it in your .env.local file.'
    );
  }

  return apiKey;
}

/**
 * Get embedding vector dimension from environment variables
 * @returns The vector dimension as a number
 * @throws Error if EMBEDDING_VECTOR_DIMENSION is not set or invalid
 */
function getEmbeddingVectorDimension(): number {
  const dimension = process.env.EMBEDDING_VECTOR_DIMENSION;

  if (!dimension) {
    throw new Error(
      'EMBEDDING_VECTOR_DIMENSION environment variable is required. Please set it in your .env.local file (e.g., EMBEDDING_VECTOR_DIMENSION=1536).'
    );
  }

  const dimensionNumber = parseInt(dimension, 10);

  if (isNaN(dimensionNumber) || dimensionNumber <= 0) {
    throw new Error(
      `Invalid EMBEDDING_VECTOR_DIMENSION value. Expected a positive integer. Received: ${dimension}`
    );
  }

  return dimensionNumber;
}

/**
 * Initialize Qdrant client singleton instance
 * Uses globalThis to persist across Next.js hot-reloads in development
 * This ensures only one client instance is created for optimal performance
 */
function initializeQdrantClient(): QdrantClient {
  // Check globalThis first (for Next.js hot-reload support)
  if (globalThis.__qdrantVectorClient) {
    return globalThis.__qdrantVectorClient;
  }

  try {
    const url = getQdrantUrl();
    const apiKey = getQdrantApiKey();

    const client = new QdrantClient({
      url,
      apiKey,
    });

    // Store in globalThis for Next.js hot-reload persistence
    globalThis.__qdrantVectorClient = client;

    console.log(`[Qdrant Vector Client] Initialized client for ${url}`);

    return client;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Qdrant Vector Client] Initialization failed:', errorMessage);
    throw new Error(`Failed to initialize Qdrant client: ${errorMessage}`);
  }
}

/**
 * Returns the singleton QdrantClient instance
 * Initializes the client if it hasn't been initialized yet
 * 
 * @returns The QdrantClient singleton instance
 * @throws Error if client initialization fails or if called on client-side
 * 
 * @example
 * ```ts
 * import { getVectorClient } from '@/lib/vector/qdrant-client';
 * 
 * // In an API route or Server Action
 * const client = getVectorClient();
 * const collections = await client.getCollections();
 * ```
 */
export function getVectorClient(): QdrantClient {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error(
      'Qdrant client can only be used on the server side. This function must be called from API routes or Server Actions.'
    );
  }

  return initializeQdrantClient();
}

/**
 * Ensures a Qdrant collection exists, creating it if it doesn't
 * Uses the EMBEDDING_VECTOR_DIMENSION from environment variables for vector size
 * Collections are created with COSINE distance metric and HNSW indexing
 * 
 * @param collectionName The name of the collection to ensure exists
 * @returns Promise<void> Resolves when the collection is guaranteed to exist
 * @throws Error if collection creation fails or if required environment variables are missing
 * 
 * @example
 * ```ts
 * import { ensureCollection } from '@/lib/vector/qdrant-client';
 * 
 * // Ensure a collection exists (uses EMBEDDING_VECTOR_DIMENSION from env)
 * await ensureCollection('my_collection');
 * ```
 */
export async function ensureCollection(collectionName: string): Promise<void> {
  try {
    const client = getVectorClient();
    const vectorDimension = getEmbeddingVectorDimension();

    // Check if collection exists
    const existsResult = await client.collectionExists(collectionName);

    if (existsResult.exists) {
      console.log(`[Qdrant Vector Client] Collection '${collectionName}' already exists`);
      return;
    }

    // Collection doesn't exist, create it
    console.log(
      `[Qdrant Vector Client] Creating collection '${collectionName}' with vector dimension ${vectorDimension}...`
    );

    await client.createCollection(collectionName, {
      vectors: {
        size: vectorDimension,
        distance: 'Cosine', // COSINE distance metric as specified
      },
      // Enable HNSW indexing for efficient similarity search
      hnsw_config: {
        m: 16, // Number of edges per node (default: 16)
        ef_construct: 100, // Number of neighbours to consider during index building
        full_scan_threshold: 10000, // Full-scan threshold in KB
        max_indexing_threads: 0, // Auto-select threads (0 = automatic)
      },
    });

    console.log(`[Qdrant Vector Client] Collection '${collectionName}' created successfully`);
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Qdrant Vector Client] Failed to ensure collection '${collectionName}': ${errorMessage}`
    );
    throw new Error(`Failed to ensure collection '${collectionName}': ${errorMessage}`);
  }
}

/**
 * Upserts vectors into a Qdrant collection
 * Wrapper around qdrantClient.upsert for consistent error handling
 * 
 * @param collectionName The name of the collection to upsert into
 * @param points Array of PointStruct points to upsert
 * @returns Promise<void> Resolves when the upsert operation completes
 * @throws Error if the upsert operation fails
 * 
 * @example
 * ```ts
 * import { upsertVectors } from '@/lib/vector/qdrant-client';
 * 
 * await upsertVectors('my_collection', [
 *   {
 *     id: 'point-1',
 *     vector: [0.1, 0.2, 0.3],
 *     payload: { text: 'Sample text' }
 *   }
 * ]);
 * ```
 */
export async function upsertVectors(
  collectionName: string,
  points: PointStruct[]
): Promise<void> {
  try {
    const client = getVectorClient();

    await client.upsert(collectionName, {
      wait: true, // Wait for the operation to complete
      points,
    });

    console.log(
      `[Qdrant Vector Client] Successfully upserted ${points.length} point(s) into collection '${collectionName}'`
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Qdrant Vector Client] Failed to upsert vectors into '${collectionName}': ${errorMessage}`
    );
    throw new Error(
      `Failed to upsert vectors into collection '${collectionName}': ${errorMessage}`
    );
  }
}

/**
 * Searches for similar vectors in a Qdrant collection
 * Wrapper around qdrantClient.search for consistent error handling
 * 
 * @param collectionName The name of the collection to search in
 * @param vector The query vector to search with
 * @param limit Maximum number of results to return
 * @param filters Optional filter conditions to apply to the search
 * @returns Promise<ScoredPoint[]> Array of scored points matching the query
 * @throws Error if the search operation fails
 * 
 * @example
 * ```ts
 * import { searchVectors } from '@/lib/vector/qdrant-client';
 * 
 * const results = await searchVectors(
 *   'my_collection',
 *   [0.1, 0.2, 0.3],
 *   10,
 *   {
 *     must: [
 *       { key: 'userId', match: { value: 'user-123' } }
 *     ]
 *   }
 * );
 * ```
 */
export async function searchVectors(
  collectionName: string,
  vector: number[],
  limit: number,
  filters?: Filter
): Promise<ScoredPoint[]> {
  try {
    const client = getVectorClient();

    const searchResult = await client.search(collectionName, {
      vector,
      limit,
      filter: filters as any, // Type assertion for filter structure
      with_payload: true, // Include payload in results
      with_vector: false, // Don't return vectors to save bandwidth
    });

    console.log(
      `[Qdrant Vector Client] Search in '${collectionName}' returned ${searchResult.length} result(s)`
    );

    // Type assertion to match Qdrant's actual return type
    return searchResult as ScoredPoint[];
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Qdrant Vector Client] Failed to search vectors in '${collectionName}': ${errorMessage}`
    );
    throw new Error(
      `Failed to search vectors in collection '${collectionName}': ${errorMessage}`
    );
  }
}
