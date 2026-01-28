'use server';

import 'server-only';
import { QdrantClient } from '@qdrant/qdrant-js';

/**
 * Primary vector collection name for Pandora's Box memory storage
 * This collection stores conversation memories and knowledge embeddings
 */
export const PANDORA_MEMORY_V1 = 'PANDORA_MEMORY_V1';

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
 * Initialize Qdrant client singleton instance
 * Uses globalThis to persist across Next.js hot-reloads in development
 * This ensures only one client instance is created for optimal performance
 * and efficient connection pooling across serverless functions
 */
function initializeQdrantClient(): QdrantClient {
  // Check globalThis first (for Next.js hot-reload support)
  if (globalThis.__qdrantVectorClient) {
    return globalThis.__qdrantVectorClient;
  }

  try {
    const url = getQdrantUrl();
    const apiKey = process.env.QDRANT_API_KEY; // Optional, only if authentication is enabled

    const clientConfig: { url: string; apiKey?: string } = {
      url,
    };

    // Add API key if provided (for authenticated Qdrant instances)
    if (apiKey) {
      clientConfig.apiKey = apiKey;
    }

    const client = new QdrantClient(clientConfig);

    // Store in globalThis for Next.js hot-reload persistence
    globalThis.__qdrantVectorClient = client;

    console.log(
      `[Qdrant Vector Client] Initialized client for ${url}${apiKey ? ' (with API key)' : ''}`
    );

    return client;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Qdrant Vector Client] Initialization failed:', errorMessage);
    throw new Error(`Failed to initialize Qdrant client: ${errorMessage}`);
  }
}

/**
 * Exported Qdrant client instance
 * This is a singleton that is initialized on first import
 * Uses the standard singleton pattern for optimal performance
 * Ready for use in Next.js API routes or Server Actions
 * 
 * @example
 * ```ts
 * import { qdrantClient, PANDORA_MEMORY_V1 } from '@/lib/vector/qdrant-client';
 * 
 * // In an API route or Server Action
 * const collections = await qdrantClient.getCollections();
 * 
 * // Upsert vectors to the primary collection
 * await qdrantClient.upsert(PANDORA_MEMORY_V1, {
 *   points: [{ id: '1', vector: [0.1, 0.2, 0.3] }]
 * });
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
 * Ensures the PANDORA_MEMORY_V1 collection exists, creating it if it doesn't
 * This function checks if the collection exists and creates it with the specified
 * configuration optimized for Cosine similarity searches with 1536-dimensional vectors
 * 
 * Collection Configuration:
 * - Vector dimension: 1536 (standard for modern embeddings like OpenAI's text-embedding-ada-002)
 * - Distance metric: Cosine (optimized for similarity searches)
 * - HNSW indexing: Enabled for efficient approximate nearest neighbor search
 * 
 * @returns Promise<void> Resolves when the collection is guaranteed to exist
 * @throws Error if collection creation fails or if connection errors occur during initialization
 * 
 * @example
 * ```ts
 * import { ensureCollectionExists } from '@/lib/vector/qdrant-client';
 * 
 * // Ensure the memory collection exists before operations
 * await ensureCollectionExists();
 * ```
 */
export async function ensureCollectionExists(): Promise<void> {
  try {
    // Check if collection exists
    const existsResult = await qdrantClient.collectionExists(PANDORA_MEMORY_V1);

    if (existsResult.exists) {
      console.log(`[Qdrant Vector Client] Collection '${PANDORA_MEMORY_V1}' already exists`);
      return;
    }

    // Collection doesn't exist, create it
    console.log(
      `[Qdrant Vector Client] Creating collection '${PANDORA_MEMORY_V1}' with vector dimension 1536 (Cosine similarity)...`
    );

    await qdrantClient.createCollection(PANDORA_MEMORY_V1, {
      vectors: {
        size: 1536, // Standard dimension for modern embeddings
        distance: 'Cosine', // Cosine similarity for optimal semantic search
      },
      // Enable HNSW indexing for efficient similarity search
      hnsw_config: {
        m: 16, // Number of edges per node (default: 16, good balance of accuracy and space)
        ef_construct: 100, // Number of neighbours to consider during index building (default: 100)
        full_scan_threshold: 10000, // Full-scan threshold in KB (default: 10000)
        max_indexing_threads: 0, // Auto-select threads (0 = automatic, typically 8-16 threads)
      },
    });

    console.log(`[Qdrant Vector Client] Collection '${PANDORA_MEMORY_V1}' created successfully`);
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Qdrant Vector Client] Failed to ensure collection '${PANDORA_MEMORY_V1}': ${errorMessage}`
    );

    // Provide more context for connection errors
    if (
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('network')
    ) {
      throw new Error(
        `Failed to connect to Qdrant at ${process.env.QDRANT_URL || 'QDRANT_URL'}. Please verify the service is running and the URL is correct.`
      );
    }

    throw new Error(`Failed to ensure collection '${PANDORA_MEMORY_V1}': ${errorMessage}`);
  }
}

/**
 * Upsert points into the Qdrant collection
 * @param collectionName Name of the collection
 * @param points Array of points to upsert
 */
export async function upsertVectors(collectionName: string, points: any[]) {
  // Ensure collection exists before upserting
  await ensureCollectionExists();

  await qdrantClient.upsert(collectionName, {
    wait: true,
    points,
  });
}

export { PANDORA_MEMORY_V1 as MEMORY_COLLECTION_NAME };
