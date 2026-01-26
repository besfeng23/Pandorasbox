'use server';

import 'server-only';
import { QdrantClient } from '@qdrant/js-client-rest';

/**
 * Memory collection name for storing user memories
 */
export const MEMORY_COLLECTION = 'user-memories';

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
 * Global type declaration for Next.js hot-reload support
 * This ensures the singleton instance persists across hot-reloads
 */
declare global {
  // eslint-disable-next-line no-var
  var __qdrantClient: QdrantClient | undefined;
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
 */
function initializeQdrantClient(): QdrantClient {
  // Check globalThis first (for Next.js hot-reload support)
  if (globalThis.__qdrantClient) {
    return globalThis.__qdrantClient;
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
    globalThis.__qdrantClient = client;

    console.log(
      `[Qdrant Client] Initialized client for ${url}${apiKey ? ' (with API key)' : ''}`
    );

    return client;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Qdrant Client] Initialization failed:', errorMessage);
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
 * import { qdrantClient, MEMORY_COLLECTION } from '@/lib/qdrant/qdrant-client';
 * 
 * // In an API route or Server Action
 * const collections = await qdrantClient.getCollections();
 * 
 * // Upsert vectors to the memory collection
 * await qdrantClient.upsert(MEMORY_COLLECTION, {
 *   points: [{ id: '1', vector: [0.1, 0.2, 0.3], payload: { text: 'Sample', userId: 'user-123' } }]
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
 * Search memory vectors in the Qdrant collection
 * Searches the MEMORY_COLLECTION using the provided embedding vector
 * Filters results by userId to ensure multi-tenant isolation
 * 
 * @param embedding The query embedding vector to search with
 * @param userId The user ID to filter results by (required for privacy)
 * @param k The number of results to return (default: 3)
 * @returns Promise<PointStruct[]> Array of relevant Qdrant PointStruct objects
 * @throws Error if the search operation fails or if connection errors occur
 * 
 * @example
 * ```ts
 * import { searchMemoryVectors } from '@/lib/qdrant/qdrant-client';
 * 
 * const results = await searchMemoryVectors(
 *   [0.1, 0.2, 0.3, ...], // 1536-dimensional embedding
 *   'user-123',
 *   5 // Return top 5 results
 * );
 * 
 * results.forEach(result => {
 *   console.log(`Found memory: ${result.payload?.text}`);
 * });
 * ```
 */
export async function searchMemoryVectors(
  embedding: number[],
  userId: string,
  k: number = 3
): Promise<PointStruct[]> {
  try {
    // Perform vector search with userId filter
    const searchResult = await qdrantClient.search(MEMORY_COLLECTION, {
      vector: embedding,
      limit: k,
      filter: {
        must: [
          {
            key: 'userId',
            match: {
              value: userId,
            },
          },
        ],
      },
      with_payload: true,
      with_vector: true, // Return vectors to match PointStruct type
    });

    // Convert search results to PointStruct format
    const points: PointStruct[] = searchResult.map((result) => ({
      id: result.id,
      vector: (result.vector as number[]) || [],
      payload: result.payload as Record<string, any>,
    }));

    console.log(
      `[Qdrant Client] Search returned ${points.length} result(s) for user ${userId}`
    );

    return points;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Qdrant Client] Failed to search memory vectors for user ${userId}: ${errorMessage}`
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

    throw new Error(`Failed to search memory vectors: ${errorMessage}`);
  }
}

/**
 * Store a memory vector in the Qdrant collection
 * Upserts a single point into the MEMORY_COLLECTION with the provided vector and metadata
 * 
 * @param id Unique identifier for the point (e.g., Firebase UID or UUID)
 * @param vector The embedding vector (should be 1536-dimensional for compatibility)
 * @param text The original memory content text
 * @param userId The user ID for filtering and privacy (stored in payload)
 * @returns Promise<void> Resolves when the point is successfully stored
 * @throws Error if the upsert operation fails or if connection errors occur
 * 
 * @example
 * ```ts
 * import { storeMemoryVector } from '@/lib/qdrant/qdrant-client';
 * 
 * await storeMemoryVector(
 *   'memory-123', // Unique ID
 *   [0.1, 0.2, 0.3, ...], // 1536-dimensional embedding
 *   'This is a memory about the user\'s preference',
 *   'user-123' // User ID
 * );
 * ```
 */
export async function storeMemoryVector(
  id: string,
  vector: number[],
  text: string,
  userId: string
): Promise<void> {
  try {
    // Upsert the point with payload containing text and userId
    await qdrantClient.upsert(MEMORY_COLLECTION, {
      wait: true, // Wait for the operation to complete
      points: [
        {
          id,
          vector,
          payload: {
            text,
            userId,
          },
        },
      ],
    });

    console.log(
      `[Qdrant Client] Successfully stored memory vector with id '${id}' for user ${userId}`
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Qdrant Client] Failed to store memory vector with id '${id}': ${errorMessage}`
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

    throw new Error(`Failed to store memory vector: ${errorMessage}`);
  }
}
