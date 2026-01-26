'use server';

import 'server-only';
import { QdrantClient } from '@qdrant/qdrant-js';

/**
 * Main memory storage collection name for Pandora's Box
 */
export const PANDORA_MEMORY_COLLECTION = 'pandora-user-memory';

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
 * Defaults to http://localhost:6333 if not explicitly set
 * @returns The Qdrant service URL
 */
function getQdrantUrl(): string {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';

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
    const apiKey = process.env.QDRANT_API_KEY;

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
 * Get the Qdrant client singleton instance
 * Initializes the client if it hasn't been initialized yet
 * This is the primary exported function for accessing the Qdrant client
 * 
 * @returns The QdrantClient singleton instance
 * @throws Error if client initialization fails or if called on client-side
 * 
 * @example
 * ```ts
 * import { getQdrantClient, PANDORA_MEMORY_COLLECTION } from '@/lib/qdrant/client';
 * 
 * // In an API route or Server Action
 * const client = getQdrantClient();
 * const collections = await client.getCollections();
 * 
 * // Upsert vectors to the main memory collection
 * await client.upsert(PANDORA_MEMORY_COLLECTION, {
 *   points: [{ id: '1', vector: [0.1, 0.2, 0.3] }]
 * });
 * ```
 */
export function getQdrantClient(): QdrantClient {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error(
      'Qdrant client can only be used on the server side. This function must be called from API routes or Server Actions.'
    );
  }

  return initializeQdrantClient();
}

/**
 * Exported Qdrant client singleton instance
 * This is initialized on first import and can be used directly
 * Uses the standard singleton pattern for optimal performance
 * Ready for use in Next.js API routes or Server Actions
 * 
 * @example
 * ```ts
 * import { qdrantClient, PANDORA_MEMORY_COLLECTION } from '@/lib/qdrant/client';
 * 
 * // In an API route or Server Action
 * const collections = await qdrantClient.getCollections();
 * 
 * // Upsert vectors to the main memory collection
 * await qdrantClient.upsert(PANDORA_MEMORY_COLLECTION, {
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

