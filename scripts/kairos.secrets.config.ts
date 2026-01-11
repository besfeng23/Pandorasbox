/**
 * Kairos Secrets Broker Configuration
 * 
 * Maps target identifiers to allowed secret names.
 * Deny by default - only explicitly listed secrets are allowed.
 */

export interface TargetConfig {
  /** List of allowed secret names for this target */
  allowedSecrets: string[];
  /** Optional description for this target */
  description?: string;
}

export interface SecretsConfig {
  /** Map of target identifier -> allowed secrets */
  targets: Record<string, TargetConfig>;
}

/**
 * Configuration mapping targets to their allowed secrets.
 * 
 * Target identifiers are Base44 or other trusted caller identifiers.
 * Secret names must match GCP Secret Manager secret names.
 */
export const secretsConfig: SecretsConfig = {
  targets: {
    // Example: Base44 integration
    base44: {
      description: "Base44 integration - allowed secrets",
      allowedSecrets: [
        "linear-api-key",      // Maps to LINEAR_API_KEY env var
        "tavily-api-key",      // Maps to TAVILY_API_KEY env var
        "chatgpt-api-key",     // Maps to CHATGPT_API_KEY env var
        "openai-api-key",      // Maps to OPENAI_API_KEY env var
      ],
    },
    // Add more targets as needed
    // example_target: {
    //   description: "Example target description",
    //   allowedSecrets: [
    //     "SECRET_NAME_1",
    //     "SECRET_NAME_2",
    //   ],
    // },
  },
};

/**
 * Get allowed secrets for a target.
 * Returns empty array if target not found (deny by default).
 */
export function getAllowedSecrets(target: string): string[] {
  return secretsConfig.targets[target]?.allowedSecrets || [];
}

/**
 * Check if a secret is allowed for a target.
 */
export function isSecretAllowed(target: string, secretName: string): boolean {
  const allowed = getAllowedSecrets(target);
  return allowed.includes(secretName);
}

