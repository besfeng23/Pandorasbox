'use server';

import 'server-only';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { QdrantClient as QdrantClientType } from '@qdrant/js-client-rest';

let qdrantClientInstance: QdrantClientType | null = null;

/**
 * Get Qdrant configuration from environment variables
 * Supports both QDRANT_URL (legacy) and QDRANT_HOST/QDRANT_PORT (preferred) formats
 * @returns Configuration object with host, port, and optional API key
 * @throws Error if required environment variables are missing
 */
function getQdrantConfig(): {
  host: string;
  port: number;
  apiKey?: string;
  url: string;
} {
  // Priority 1: Use QDRANT_URL if provided (for backward compatibility)
  const qdrantUrl = process.env.QDRANT_URL;
  if (qdrantUrl) {
    try {
      const url = new URL(qdrantUrl);
      const host = url.hostname;
      const port = parseInt(url.port || (url.protocol === 'https:' ? '443' : '80'), 10);
      const protocol = url.protocol.replace(':', '');
      
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid port in QDRANT_URL: ${url.port}`);
      }

      return {
        host,
        port,
        apiKey: process.env.QDRANT_API_KEY,
        url: qdrantUrl,
      };
    } catch (error: any) {
      throw new Error(
        `Invalid QDRANT_URL format. Expected format: "http://host:port" or "https://host:port". Received: ${qdrantUrl}`
      );
    }
  }

  // Priority 2: Use QDRANT_HOST and QDRANT_PORT (preferred format)
  const host = process.env.QDRANT_HOST;
  const port = process.env.QDRANT_PORT;

  if (!host) {
    throw new Error(
      'QDRANT_HOST environment variable is required (or use QDRANT_URL). Please set it to your Qdrant host (e.g., "localhost").'
    );
  }

  if (!port) {
    throw new Error(
      'QDRANT_PORT environment variable is required (or use QDRANT_URL). Please set it to your Qdrant port (e.g., "6333").'
    );
  }

  const portNumber = parseInt(port, 10);
  if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
    throw new Error(
      `QDRANT_PORT must be a valid port number (1-65535). Received: ${port}`
    );
  }

  const apiKey = process.env.QDRANT_API_KEY; // Optional, only needed for authenticated deployments
  const protocol = process.env.QDRANT_PROTOCOL || 'http';
  const url = `${protocol}://${host}:${portNumber}`;

  return {
    host,
    port: portNumber,
    apiKey,
    url,
  };
}

/**
 * Initialize Qdrant client singleton instance
 * @returns The initialized QdrantClient instance
 * @throws Error if initialization fails
 */
function initializeQdrantClient(): QdrantClientType {
  if (qdrantClientInstance) {
    return qdrantClientInstance;
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

    qdrantClientInstance = new QdrantClient(clientConfig);

    console.log(`[Qdrant Client] Initialized client for ${config.url}`);
    
    return qdrantClientInstance;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Qdrant Client] Initialization failed:', errorMessage);
    throw new Error(`Failed to initialize Qdrant client: ${errorMessage}`);
  }
}

/**
 * Get the Qdrant client singleton instance
 * Initializes the client if it hasn't been initialized yet
 * @returns The QdrantClient instance
 * @throws Error if client initialization fails
 */
export function getQdrantClient(): QdrantClientType {
  if (typeof window !== 'undefined') {
    throw new Error(
      'Qdrant client can only be used on the server side. This function must be called from API routes or Server Actions.'
    );
  }

  return initializeQdrantClient();
}

/**
 * Test function to verify Qdrant connectivity
 * Lists all existing collections and logs the result
 * This function can be called during module initialization or as a standalone test
 */
export async function testQdrantConnection(): Promise<void> {
  try {
    console.log('[Qdrant Test] Starting connectivity test...');
    
    const client = getQdrantClient();
    const collections = await client.getCollections();
    
    console.log('[Qdrant Test] ✅ Connection successful!');
    console.log(`[Qdrant Test] Found ${collections.collections.length} collection(s):`);
    
    if (collections.collections.length === 0) {
      console.log('[Qdrant Test] No collections found. This is normal for a fresh Qdrant instance.');
    } else {
      collections.collections.forEach((collection) => {
        console.log(`[Qdrant Test]   - ${collection.name}`);
      });
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Qdrant Test] ❌ Connection failed:', errorMessage);
    console.error('[Qdrant Test] Please verify:');
    console.error('[Qdrant Test]   1. Qdrant server is running');
    console.error('[Qdrant Test]   2. QDRANT_HOST and QDRANT_PORT environment variables are set correctly');
    console.error('[Qdrant Test]   3. Network connectivity to Qdrant server');
    if (process.env.QDRANT_API_KEY) {
      console.error('[Qdrant Test]   4. QDRANT_API_KEY is valid (if using authentication)');
    }
    throw error;
  }
}

// Auto-run test on module load (only in development or when explicitly enabled)
if (process.env.NODE_ENV === 'development' || process.env.QDRANT_AUTO_TEST === 'true') {
  // Run test asynchronously to avoid blocking module initialization
  testQdrantConnection().catch((error) => {
    // Log error but don't throw - allows the module to load even if Qdrant is temporarily unavailable
    console.warn('[Qdrant Client] Auto-test failed, but module loaded. Qdrant may be unavailable.');
  });
}

