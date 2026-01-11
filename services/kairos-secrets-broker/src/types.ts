/**
 * Type definitions for Kairos Secrets Broker
 */

export interface BundleRequest {
  /** Target identifier (e.g., "base44") */
  target: string;
  /** List of secret names to retrieve */
  secrets: string[];
}

export interface BundleResponse {
  /** Schema version for API compatibility */
  schemaVersion: string;
  /** ISO 8601 timestamp when bundle expires */
  expiresAt: string;
  /** Map of secret names to values */
  secrets: Record<string, string>;
}

export interface ErrorResponse {
  error: string;
  code: string;
  message?: string;
}

