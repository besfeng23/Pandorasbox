import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GOOGLE_CLOUD_CONFIG } from './config';

// Initialize the client
// In Cloud Run/App Hosting, authentication is handled automatically via the service account
const client = new SecretManagerServiceClient();

export const secrets = {
    /**
     * Access a secret version from Google Cloud Secret Manager.
     * @param secretName The name of the secret (e.g., 'OPENAI_API_KEY')
     * @param version The version string (default: 'latest')
     */
    async get(secretName: string, version: string = 'latest'): Promise<string | null> {
        try {
            const name = `projects/${GOOGLE_CLOUD_CONFIG.projectId}/secrets/${secretName}/versions/${version}`;

            const [accessResponse] = await client.accessSecretVersion({
                name: name,
            });

            const responsePayload = accessResponse.payload?.data?.toString();

            if (!responsePayload) {
                console.warn(`[SecretManager] Secret ${secretName} is empty or undefined.`);
                return null;
            }

            return responsePayload;
        } catch (error) {
            console.error(`[SecretManager] Error fetching secret ${secretName}:`, error);
            // Fallback: Check process.env in case it was loaded at build time or via .env
            return process.env[secretName] || null;
        }
    },

    /**
     * Helper to get common API keys securely
     */
    async getOpenAIKey(): Promise<string | null> {
        return this.get('OPENAI_API_KEY');
    },

    async getAnthropicKey(): Promise<string | null> {
        return this.get('ANTHROPIC_API_KEY');
    }
};
