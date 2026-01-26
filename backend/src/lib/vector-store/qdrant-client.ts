'use server';

import 'server-only';
import { QdrantClient } from '@qdrant/qdrant-js';

/**
 * Primary vector collection name for Pandora's Box memory storage
 */
export const VECTOR_COLLECTION = 'pandora_memory';

/**
 * Global type declaration for Next.js hot-reload support
 * This ensures the singleton instance persists across hot-reloads
 */
declare global {
  // eslint-disable-next-line no-var
  var __qdrantVectorStoreClient: QdrantClient | undefined;
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
  if (globalThis.__qdrantVectorStoreClient) {
    return globalThis.__qdrantVectorStoreClient;
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
    globalThis.__qdrantVectorStoreClient = client;

    console.log(`[Qdrant Vector Store] Initialized client for ${url}${apiKey ? ' (with API key)' : ''}`);

    return client;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Qdrant Vector Store] Initialization failed:', errorMessage);
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
 * import { qdrantClient, VECTOR_COLLECTION } from '@/lib/vector-store/qdrant-client';
 * 
 * // In an API route or Server Action
 * const collections = await qdrantClient.getCollections();
 * 
 * // Upsert vectors to the primary collection
 * await qdrantClient.upsert(VECTOR_COLLECTION, {
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

