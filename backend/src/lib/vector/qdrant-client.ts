'use server';

import 'server-only';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { QdrantClient as QdrantClientType } from '@qdrant/js-client-rest';

/**
 * Memory collection name constant
 * This is the default collection used for storing vectorized memories
 */
export const MEMORY_COLLECTION_NAME = 'pandora_memory';

/**
 * Global type declaration for Next.js hot-reload support
 * This ensures the singleton instance persists across hot-reloads
 */
declare global {
  // eslint-disable-next-line no-var
  var __qdrantClient: QdrantClientType | undefined;
}

/**
 * Get Qdrant configuration from environment variables
 * @returns Configuration object with url and optional API key
 * @throws Error if required environment variables are missing
 */
function getQdrantConfig(): {
  url: string;
  apiKey?: string;
} {
  // Get QDRANT_HOST (can be a full URL like "http://qdrant:6333" or just hostname)
  const qdrantHost = process.env.QDRANT_HOST;

  if (!qdrantHost) {
    throw new Error(
      'QDRANT_HOST environment variable is required. Please set it to your Qdrant host (e.g., "http://qdrant:6333" or "localhost").'
    );
  }

  // Parse QDRANT_HOST - it can be a full URL or just a hostname
  let url: string;
  try {
    // Try to parse as URL first
    const parsedUrl = new URL(qdrantHost);
    url = parsedUrl.toString();
  } catch {
    // If not a valid URL, treat as hostname and construct URL
    // Default to http:// if no protocol specified
    const protocol = process.env.QDRANT_PROTOCOL || 'http';
    const port = process.env.QDRANT_PORT || '6333';
    url = `${protocol}://${qdrantHost}:${port}`;
  }

  // Get optional API key for authenticated deployments
  const apiKey = process.env.QDRANT_API_KEY;

  return {
    url,
    apiKey,
  };
}

/**
 * Initialize Qdrant client singleton instance
 * Uses globalThis to persist across Next.js hot-reloads
 * @returns The initialized QdrantClient instance
 * @throws Error if initialization fails
 */
function initializeQdrantClient(): QdrantClientType {
  // Check globalThis first (for Next.js hot-reload support)
  if (globalThis.__qdrantClient) {
    return globalThis.__qdrantClient;
  }

  try {
    const config = getQdrantConfig();

    const clientConfig: {
      url: string;
      apiKey?: string;
    } = {
      url: config.url,
    };

    if (config.apiKey) {
      clientConfig.apiKey = config.apiKey;
    }

    const client = new QdrantClient(clientConfig);

    // Store in globalThis for Next.js hot-reload persistence
    globalThis.__qdrantClient = client;

    console.log(`[Qdrant Client] Initialized client for ${config.url}`);
    if (config.apiKey) {
      console.log('[Qdrant Client] Using API key authentication');
    }

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
 * This function ensures a single instance is used across the application,
 * preventing connection proliferation and managing resources efficiently
 * @returns The QdrantClient instance
 * @throws Error if client initialization fails or if called on client-side
 */
export function getQdrantClient(): QdrantClientType {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error(
      'Qdrant client can only be used on the server side. This function must be called from API routes or Server Actions.'
    );
  }

  return initializeQdrantClient();
}

/**
 * Upsert vectors to a Qdrant collection
 * Helper function for storing vector points with payloads
 * @param collectionName The name of the Qdrant collection
 * @param points Array of points to upsert, each with id, vector, and payload
 */
export async function upsertVectors(
  collectionName: string,
  points: Array<{
    id: string | number;
    vector: number[];
    payload?: Record<string, any>;
  }>
): Promise<void> {
  const client = getQdrantClient();
  
  await client.upsert(collectionName, {
    wait: true,
    points: points.map((point) => ({
      id: point.id,
      vector: point.vector,
      payload: point.payload || {},
    })),
  });
}

