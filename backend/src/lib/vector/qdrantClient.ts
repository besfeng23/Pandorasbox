'use server';

import 'server-only';
import { QdrantClient } from '@qdrant/qdrant-js';

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
 * Initialize Qdrant client singleton instance
 * Uses globalThis to persist across Next.js hot-reloads in development
 */
function initializeQdrantClient(): QdrantClient {
  // Check globalThis first (for Next.js hot-reload support)
  if (globalThis.__qdrantClient) {
    return globalThis.__qdrantClient;
  }

  try {
    const url = getQdrantUrl();
    const apiKey = process.env.QDRANT_API_KEY;

    const clientConfig: { url: string; apiKey?: string } = {
      url,
    };

    if (apiKey) {
      clientConfig.apiKey = apiKey;
    }

    const client = new QdrantClient(clientConfig);

    // Store in globalThis for Next.js hot-reload persistence
    globalThis.__qdrantClient = client;

    console.log(`[Qdrant Client] Initialized client for ${url}${apiKey ? ' (with API key)' : ''}`);

    return client;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Qdrant Client] Initialization failed:', errorMessage);
    throw new Error(`Failed to initialize Qdrant client: ${errorMessage}`);
  }
}

/**
 * Global type declaration for Next.js hot-reload support
 * This ensures the singleton instance persists across hot-reloads
 */
declare global {
  // eslint-disable-next-line no-var
  var __qdrantClient: QdrantClient | undefined;
}

/**
 * Exported Qdrant client instance
 * This is a singleton that is initialized on first import
 * Ready for use in Next.js API routes or Server Actions
 * 
 * @example
 * ```ts
 * import { qdrantClient } from '@/lib/vector/qdrantClient';
 * 
 * // In an API route or Server Action
 * const collections = await qdrantClient.getCollections();
 * ```
 */
export const qdrantClient: QdrantClient = (() => {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error(
      'Qdrant client can only be used on the server side. This must be imported in API routes or Server Actions.'
    );
  }

  return initializeQdrantClient();
})();

/**
 * Ensure a Qdrant collection exists, creating it if it doesn't
 * This utility function checks if a collection exists and creates it with the specified
 * configuration if it doesn't exist. Uses HNSW index configuration and Euclidean distance.
 * 
 * @param collectionName The name of the collection to ensure exists
 * @param vectorSize The size of the vectors (default: 1536, standard for popular embeddings)
 * @returns Promise<void> Resolves when the collection is guaranteed to exist
 * @throws Error if collection creation fails or if the client is not initialized
 * 
 * @example
 * ```ts
 * import { ensureCollection } from '@/lib/vector/qdrantClient';
 * 
 * // Ensure a collection exists with default 1536-dimensional vectors
 * await ensureCollection('my_collection');
 * 
 * // Ensure a collection exists with custom vector size
 * await ensureCollection('custom_collection', 768);
 * ```
 */
export async function ensureCollection(
  collectionName: string,
  vectorSize: number = 1536
): Promise<void> {
  try {
    // Check if collection exists
    const existsResult = await qdrantClient.collectionExists(collectionName);

    if (existsResult.exists) {
      console.log(`[Qdrant Client] Collection '${collectionName}' already exists`);
      return;
    }

    // Collection doesn't exist, create it
    console.log(`[Qdrant Client] Creating collection '${collectionName}' with vector size ${vectorSize}...`);

    await qdrantClient.createCollection(collectionName, {
      vectors: {
        size: vectorSize,
        distance: 'Euclid', // Euclidean distance metric
      },
      hnsw_config: {
        m: 16, // Number of edges per node (default: 16, good balance of accuracy and space)
        ef_construct: 100, // Number of neighbours to consider during index building (default: 100)
        full_scan_threshold: 10000, // Full-scan threshold in KB (default: 10000)
        max_indexing_threads: 0, // Auto-select threads (0 = automatic, 8-16 threads)
      },
    });

    console.log(`[Qdrant Client] Collection '${collectionName}' created successfully`);
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Qdrant Client] Failed to ensure collection '${collectionName}': ${errorMessage}`
    );
    throw new Error(`Failed to ensure collection '${collectionName}': ${errorMessage}`);
  }
}

