/**
 * Base44 Secrets from Google Cloud Secret Manager
 * 
 * Fetches Base44 API credentials from GCP Secret Manager.
 * 
 * Required secrets in GCP:
 * - base44-app-id: Base44 App ID (e.g., 6962980527a433f05c114277)
 * - base44-api-key: Base44 API key
 */

let cachedSecrets: { appId?: string; apiKey?: string } | null = null;
let secretCacheExpiry: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get Base44 credentials from GCP Secret Manager
 */
export async function getBase44Secrets(): Promise<{ appId: string; apiKey: string }> {
  // Return cached secrets if still valid
  const now = Date.now();
  if (cachedSecrets && secretCacheExpiry > now && cachedSecrets.appId && cachedSecrets.apiKey) {
    return {
      appId: cachedSecrets.appId,
      apiKey: cachedSecrets.apiKey,
    };
  }

  // Try to use @google-cloud/secret-manager if available
  try {
    const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
    const client = new SecretManagerServiceClient();
    
    const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 
                       process.env.GCP_PROJECT || 
                       'seismic-vista-480710-q5';

    // Fetch both secrets in parallel
    const [appIdVersion, apiKeyVersion] = await Promise.all([
      client.accessSecretVersion({
        name: `projects/${PROJECT_ID}/secrets/base44-app-id/versions/latest`,
      }),
      client.accessSecretVersion({
        name: `projects/${PROJECT_ID}/secrets/base44-api-key/versions/latest`,
      }),
    ]);

    const appId = appIdVersion[0].payload?.data?.toString().trim() || '';
    const apiKey = apiKeyVersion[0].payload?.data?.toString().trim() || '';

    if (!appId || !apiKey) {
      throw new Error('Missing Base44 credentials in Secret Manager');
    }

    // Cache the secrets
    cachedSecrets = { appId, apiKey };
    secretCacheExpiry = now + CACHE_TTL_MS;

    return { appId, apiKey };
  } catch (error: any) {
    // Fallback to environment variables if Secret Manager fails
    const appId = process.env.BASE44_APP_ID;
    const apiKey = process.env.BASE44_API_KEY;

    if (appId && apiKey) {
      console.warn('[Base44] Using environment variables (Secret Manager unavailable)');
      return { appId, apiKey };
    }

    // If Secret Manager import fails, it might not be installed
    if (error.message?.includes('Cannot find module')) {
      console.warn('[Base44] @google-cloud/secret-manager not installed, falling back to env vars');
      if (appId && apiKey) {
        return { appId, apiKey };
      }
    }

    throw new Error(
      `Failed to get Base44 credentials: ${error.message}. ` +
      `Ensure secrets 'base44-app-id' and 'base44-api-key' exist in GCP Secret Manager, ` +
      `or set BASE44_APP_ID and BASE44_API_KEY environment variables.`
    );
  }
}

/**
 * Clear the secret cache (useful for testing)
 */
export function clearBase44SecretCache() {
  cachedSecrets = null;
  secretCacheExpiry = 0;
}

