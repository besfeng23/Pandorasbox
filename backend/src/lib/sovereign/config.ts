// Support both INFERENCE_BASE_URL (preferred) and INFERENCE_URL (legacy)
const baseUrl = process.env.INFERENCE_BASE_URL || process.env.INFERENCE_URL || 'http://localhost:8000';
export const INFERENCE_URL = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
export const INFERENCE_MODEL = process.env.INFERENCE_MODEL || 'pandora';
export const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'all-MiniLM-L6-v2';


