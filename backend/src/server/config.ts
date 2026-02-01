
import 'server-only';

export interface ServerConfig {
  inferenceBaseUrl: string;
  inferenceModel: string;
  embeddingsBaseUrl: string;
  embeddingsDimension: number;
  qdrantUrl: string;
  firebaseProjectId: string;
}

let cachedConfig: ServerConfig | null = null;

export async function getServerConfig(): Promise<ServerConfig> {
  if (cachedConfig) {
    console.log('[Config] Using cached config');
    return cachedConfig;
  }

  console.log('[Config] Loading server configuration...');
  console.log('[Config] Environment check:', {
    hasSecretsUrl: !!process.env.SECRETS_URL,
    nodeEnv: process.env.NODE_ENV,
    hasInferenceBaseUrl: !!process.env.INFERENCE_BASE_URL,
    hasInferenceUrl: !!process.env.INFERENCE_URL,
    hasUniverseInferenceUrl: !!process.env.UNIVERSE_INFERENCE_URL,
    hasUniverseModel: !!process.env.UNIVERSE_MODEL,
    hasEmbeddingsBaseUrl: !!process.env.EMBEDDINGS_BASE_URL,
    hasQdrantUrl: !!process.env.QDRANT_URL
  });

  // Try Cloud Run secrets URL if available
  const secretsUrl = process.env.SECRETS_URL;
  if (secretsUrl && process.env.NODE_ENV === 'production') {
    try {
      console.log(`[Config] Attempting to fetch secrets from URL: ${secretsUrl}`);
      const res = await fetch(secretsUrl);
      if (res.ok) {
        const secrets = await res.json();
        console.log('[Config] Successfully loaded secrets from URL');
        // Support both INFERENCE_BASE_URL (preferred) and INFERENCE_URL (legacy)
        const inferenceUrl = secrets.UNIVERSE_INFERENCE_URL || secrets.INFERENCE_BASE_URL || secrets.INFERENCE_URL ||
          process.env.UNIVERSE_INFERENCE_URL || process.env.INFERENCE_BASE_URL || process.env.INFERENCE_URL ||
          'http://localhost:8000';
        cachedConfig = {
          inferenceBaseUrl: inferenceUrl,
          inferenceModel:
            secrets.UNIVERSE_MODEL || secrets.INFERENCE_MODEL || process.env.UNIVERSE_MODEL || process.env.INFERENCE_MODEL || 'mistral',
          embeddingsBaseUrl:
            secrets.EMBEDDINGS_BASE_URL || process.env.EMBEDDINGS_BASE_URL || 'http://localhost:8080',
          embeddingsDimension: parseInt(
            secrets.EMBEDDINGS_DIMENSION || process.env.EMBEDDINGS_DIMENSION || '384',
            10,
          ),
          qdrantUrl: secrets.QDRANT_URL || process.env.QDRANT_URL || 'http://localhost:6333',
          firebaseProjectId: secrets.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        };
        console.log('[Config] Configuration loaded:', {
          inferenceBaseUrl: cachedConfig.inferenceBaseUrl,
          inferenceModel: cachedConfig.inferenceModel,
          embeddingsBaseUrl: cachedConfig.embeddingsBaseUrl,
          qdrantUrl: cachedConfig.qdrantUrl,
          embeddingsDimension: cachedConfig.embeddingsDimension
        });
        return cachedConfig;
      } else {
        console.warn(`[Config] Secrets URL returned status ${res.status}, falling back to env vars`);
      }
    } catch (e: any) {
      console.warn('[Config] Failed to fetch secrets from URL, falling back to env vars:', e.message);
    }
  }

  // Fallback to environment variables
  console.log('[Config] Loading configuration from environment variables');
  // Support for Split-Brain UNIVERSE_INFERENCE_URL and legacy INFERENCE_URL
  const inferenceUrl = process.env.UNIVERSE_INFERENCE_URL || process.env.INFERENCE_BASE_URL || process.env.INFERENCE_URL || 'http://localhost:8000';
  cachedConfig = {
    inferenceBaseUrl: inferenceUrl,
    inferenceModel: process.env.UNIVERSE_MODEL || process.env.INFERENCE_MODEL || 'mistral',
    embeddingsBaseUrl: process.env.EMBEDDINGS_BASE_URL || 'http://localhost:8080',
    embeddingsDimension: parseInt(process.env.EMBEDDINGS_DIMENSION || '384', 10),
    qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  };

  console.log('[Config] Final configuration:', {
    inferenceBaseUrl: cachedConfig.inferenceBaseUrl,
    inferenceModel: cachedConfig.inferenceModel,
    embeddingsBaseUrl: cachedConfig.embeddingsBaseUrl,
    qdrantUrl: cachedConfig.qdrantUrl,
    embeddingsDimension: cachedConfig.embeddingsDimension,
    firebaseProjectId: cachedConfig.firebaseProjectId ? '***' : 'not set'
  });

  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
