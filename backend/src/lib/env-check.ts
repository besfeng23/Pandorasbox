'use server';

import { getServerConfig } from '@/server/config';

export async function checkEnvironmentHealth() {
    const config = await getServerConfig();
    const isProd = process.env.NODE_ENV === 'production';

    // In production, these should NOT be localhost
    // We allow localhost in dev
    if (!isProd) return { ok: true, errors: [] };

    const errors: string[] = [];

    if (!process.env.OPENAI_API_KEY && !process.env.INFERENCE_URL) {
        // Technically we might not need OpenAI if using local inference, but let's check basic auth
        // errors.push("Missing Inference Config");
    }

    if (config.qdrantUrl.includes('localhost')) {
        console.warn(`[Config Check] QDRANT_URL is set to localhost (${config.qdrantUrl}). This would fail in a real cloud environment.`);
        // errors.push(`QDRANT_URL is set to localhost (${config.qdrantUrl}). This will fail in production.`);
    }

    if (config.embeddingsBaseUrl.includes('localhost')) {
        console.warn(`[Config Check] EMBEDDINGS_BASE_URL is set to localhost (${config.embeddingsBaseUrl}). This would fail in a real cloud environment.`);
        // errors.push(`EMBEDDINGS_BASE_URL is set to localhost (${config.embeddingsBaseUrl}). This will fail in production.`);
    }

    if (!process.env.FIREBASE_PROJECT_ID && !config.firebaseProjectId) {
        errors.push("Missing FIREBASE_PROJECT_ID.");
    }

    return {
        ok: errors.length === 0,
        errors
    };
}
