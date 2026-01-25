
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
  if (cachedConfig) return cachedConfig;

  // Try Cloud Run secrets URL if available
  const secretsUrl = process.env.SECRETS_URL;
  if (secretsUrl && process.env.NODE_ENV === 'production') {
    try {
      const res = await fetch(secretsUrl);
      if (res.ok) {
        const secrets = await res.json();
        // Support both INFERENCE_BASE_URL (preferred) and INFERENCE_URL (legacy)
        const inferenceUrl = secrets.INFERENCE_BASE_URL || secrets.INFERENCE_URL || 
                             process.env.INFERENCE_BASE_URL || process.env.INFERENCE_URL || 
                             'http://localhost:8000';
        cachedConfig = {
          inferenceBaseUrl: inferenceUrl,
          inferenceModel:
            secrets.INFERENCE_MODEL || process.env.INFERENCE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3',
          embeddingsBaseUrl:
            secrets.EMBEDDINGS_BASE_URL || process.env.EMBEDDINGS_BASE_URL || 'http://localhost:8080',
          embeddingsDimension: parseInt(
            secrets.EMBEDDINGS_DIMENSION || process.env.EMBEDDINGS_DIMENSION || '384',
            10,
          ),
          qdrantUrl: secrets.QDRANT_URL || process.env.QDRANT_URL || 'http://localhost:6333',
          firebaseProjectId: secrets.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
        };
        return cachedConfig;
      }
    } catch (e) {
      console.warn('Failed to fetch secrets from URL, falling back to env vars:', e);
    }
  }

  // Fallback to environment variables
  // Support both INFERENCE_BASE_URL (preferred) and INFERENCE_URL (legacy)
  const inferenceUrl = process.env.INFERENCE_BASE_URL || process.env.INFERENCE_URL || 'http://localhost:8000';
  cachedConfig = {
    inferenceBaseUrl: inferenceUrl,
    inferenceModel: process.env.INFERENCE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3',
    embeddingsBaseUrl: process.env.EMBEDDINGS_BASE_URL || 'http://localhost:8080',
    embeddingsDimension: parseInt(process.env.EMBEDDINGS_DIMENSION || '384', 10),
    qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  };

  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
