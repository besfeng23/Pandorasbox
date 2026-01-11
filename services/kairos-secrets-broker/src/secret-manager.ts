/**
 * Secret Manager Reader with Per-Secret Allowlist
 * 
 * Deny by default - only configured secrets are allowed.
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { getAllowedSecrets, isSecretAllowed } from './config.js';

const client = new SecretManagerServiceClient();

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || 'seismic-vista-480710-q5';

/**
 * Fetch a secret value from Secret Manager.
 * Only fetches if the secret is in the allowlist for the target.
 * 
 * @param target Target identifier
 * @param secretName Secret name in GCP Secret Manager
 * @returns Secret value or null if not allowed/not found
 */
export async function fetchSecret(
  target: string,
  secretName: string
): Promise<string | null> {
  // Deny by default - check allowlist
  if (!isSecretAllowed(target, secretName)) {
    return null;
  }

  try {
    const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    
    if (!version.payload?.data) {
      return null;
    }

    // Normalize secret: trim whitespace and remove BOM
    // Cloud Run Secret Manager can inject various whitespace characters
    const rawValue = version.payload.data.toString();
    const normalizedValue = rawValue.trim().replace(/^\uFEFF/, ''); // Remove BOM and all whitespace
    
    return normalizedValue;
  } catch (error: any) {
    // Never log secret values or names in production
    if (process.env.NODE_ENV === 'development') {
      console.error(`Failed to fetch secret: ${secretName}`, error.message);
    }
    return null;
  }
}

/**
 * Fetch multiple secrets for a target.
 * Only fetches secrets that are in the allowlist.
 * 
 * @param target Target identifier
 * @param secretNames Array of secret names
 * @returns Map of secret names to values (only allowed secrets included)
 */
export async function fetchSecrets(
  target: string,
  secretNames: string[]
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  
  // Get allowed secrets for this target
  const allowedSecrets = getAllowedSecrets(target);
  
  // Filter to only requested secrets that are allowed
  const requestedAllowed = secretNames.filter(name => 
    allowedSecrets.includes(name)
  );

  // Fetch secrets in parallel (but respect rate limits in production)
  const fetchPromises = requestedAllowed.map(async (secretName) => {
    const value = await fetchSecret(target, secretName);
    if (value !== null) {
      results[secretName] = value;
    }
  });

  await Promise.all(fetchPromises);

  // Return deterministic sorted object
  return Object.keys(results)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = results[key];
      return sorted;
    }, {} as Record<string, string>);
}

