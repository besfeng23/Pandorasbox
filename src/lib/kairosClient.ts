/**
 * Kairos Event Client
 * 
 * Emits deterministic events to Kairos that map to tasks/milestones in the active plan.
 * Events include proof/evidence fields required by proof_requirements so Kairos can mark tasks "done" automatically.
 * 
 * Environment Variables:
 * - KAIROS_BASE_URL: Base URL for Kairos (used to derive default /functions endpoints)
 * - KAIROS_INGEST_URL: Override full ingest URL (default: `${KAIROS_BASE_URL}/functions/ingest`)
 * - KAIROS_INGEST_KEY: Optional API key for authentication
 * - KAIROS_SIGNING_SECRET: Optional secret for HMAC signing
 * - KAIROS_EVENT_GATEWAY_URL: Optional gateway URL (alternative to direct Base44)
 */

import { v4 as uuidv4 } from 'uuid';
import { resolveKairosEndpoints } from './kairosEndpoints';

// Event types from kairos_masterplan_v2.eventMappings
export type KairosEventType =
  // UI Events
  | 'ui.chat.message_sent'
  | 'ui.thread.created'
  | 'ui.memory.search'
  | 'ui.kb.upload_started'
  | 'ui.settings.updated'
  | 'ui.graph.opened'
  | 'ui.copy.audit_passed'
  | 'ui.copy.updated'
  // System Chat Events
  | 'system.chat.response_completed'
  | 'system.ratelimit.triggered'
  | 'system.ratelimit.cleared'
  | 'system.error.logged'
  // Thread Events
  | 'system.thread.summary_generated'
  | 'system.thread.persisted'
  | 'system.thread.updated'
  // Memory Events
  | 'system.memory.index_updated'
  | 'system.clear_memory.completed'
  | 'system.lane.memory.created'
  | 'system.memory.persisted'
  | 'system.memory.updated'
  // Artifact Events
  | 'system.artifact.extracted'
  | 'system.artifact.persisted'
  | 'system.artifact.updated'
  // Knowledge Base Events
  | 'system.kb.upload_completed'
  // Settings Events
  | 'system.export.completed'
  // Graph Events
  | 'system.graph.render_ok'
  | 'system.graph.persisted'
  | 'system.graph.analysis_complete'
  // Phase Events
  | 'system.phase.updated'
  | 'system.phase.all_completed'
  | 'system.phase.persisted'
  // Lane Events
  | 'system.lane.chat.started'
  | 'system.lane.chat.completed'
  | 'system.lane.answer.retrieval_done'
  | 'system.lane.answer.completed'
  // Search Events
  | 'system.search.completed'
  | 'system.embedding.generated'
  | 'system.embedding.failed'
  // Message Events
  | 'system.message.persisted'
  | 'system.message.updated'
  // MCP Events
  | 'system.mcp.tool_called'
  // Actions Events
  | 'system.actions.request_ok'
  // Cron Events
  | 'system.cron.executed'
  // Agent Events
  | 'system.agent.completed'
  // Auth Events
  | 'system.auth.login_success'
  | 'system.auth.login_failure'
  // Security Events
  | 'system.security.rules_verified'
  | 'system.security.violation'
  // API Key Events
  | 'system.apikey.generated'
  | 'system.apikey.revoked';

/**
 * Base event payload structure
 */
export interface KairosEventPayload {
  event_id: string;
  event_time: string;
  event_type: KairosEventType;
  source: 'pandorasbox';
  correlation_id?: string;
  dedupe_key?: string;
  payload: Record<string, any>;
}

/**
 * Event types that mark tasks "done" (proof events)
 * vs informational events (live feed only)
 */
const PROOF_EVENTS: Set<KairosEventType> = new Set([
  'system.chat.response_completed',
  'system.thread.summary_generated',
  'system.memory.index_updated',
  'system.clear_memory.completed',
  'system.artifact.extracted',
  'system.artifact.persisted',
  'system.kb.upload_completed',
  'system.export.completed',
  'system.graph.render_ok',
  'system.phase.all_completed',
  'system.lane.chat.completed',
  'system.lane.answer.completed',
  'system.memory.persisted',
  'system.thread.persisted',
  'system.message.persisted',
  'system.graph.persisted',
  'system.phase.persisted',
  'system.search.completed',
  'system.embedding.generated',
  'system.mcp.tool_called',
  'system.actions.request_ok',
  'system.cron.executed',
  'system.agent.completed',
  'system.auth.login_success',
  'system.security.rules_verified',
  'system.apikey.generated',
  'system.apikey.revoked',
  'ui.copy.audit_passed',
]);

/**
 * Required fields per event type (from masterplan eventMappings.payloadMatch)
 * Supports both eventMappings and event_mappings keys
 */
const REQUIRED_FIELDS: Record<KairosEventType, string[]> = {
  'ui.chat.message_sent': ['threadId', 'messageId'],
  'system.chat.response_completed': ['threadId', 'assistantMessageId'],
  'system.ratelimit.triggered': ['limitType'],
  'system.ratelimit.cleared': ['limitType'],
  'system.error.logged': ['code'],
  'ui.thread.created': ['threadId'],
  'system.thread.summary_generated': ['threadId'],
  'system.thread.persisted': ['threadId'],
  'system.thread.updated': ['threadId', 'title'],
  'ui.memory.search': ['query'],
  'system.memory.index_updated': ['userId'],
  'system.clear_memory.completed': ['userId'],
  'system.lane.memory.created': ['memoryId'],
  'system.memory.persisted': ['memoryId'],
  'system.memory.updated': ['memoryId'],
  'system.artifact.extracted': ['artifactId', 'messageId'],
  'system.artifact.persisted': ['artifactId'],
  'system.artifact.updated': ['artifactId', 'version'],
  'ui.kb.upload_started': ['filename'],
  'system.kb.upload_completed': ['chunkCount'],
  'ui.settings.updated': ['userId'],
  'system.export.completed': ['userId', 'bytes'],
  'ui.graph.opened': ['userId'],
  'system.graph.render_ok': ['nodeCount'],
  'system.graph.persisted': ['nodeCount', 'edgeCount'],
  'system.graph.analysis_complete': ['metric'],
  'system.phase.updated': ['phaseId', 'status'],
  'system.phase.all_completed': ['count'],
  'system.phase.persisted': ['phaseId'],
  'system.lane.chat.started': ['threadId', 'messageId'],
  'system.lane.chat.completed': ['assistantMessageId'],
  'system.lane.answer.retrieval_done': ['resultCount'],
  'system.lane.answer.completed': ['assistantMessageId'],
  'system.search.completed': ['query', 'latencyMs'],
  'system.embedding.generated': ['entityType', 'entityId'],
  'system.embedding.failed': ['entityType', 'entityId'],
  'system.message.persisted': ['messageId', 'role'],
  'system.message.updated': ['messageId', 'status'],
  'system.mcp.tool_called': ['toolName'],
  'system.actions.request_ok': ['endpoint'],
  'system.cron.executed': ['jobName', 'success'],
  'system.agent.completed': ['agentName', 'userId'],
  'system.auth.login_success': ['userId'],
  'system.auth.login_failure': ['errorCode'],
  'system.security.rules_verified': ['testSuiteId'],
  'system.security.violation': ['ruleId'],
  'system.apikey.generated': ['userId'],
  'system.apikey.revoked': ['userId'],
  'ui.copy.audit_passed': ['screenCount'],
  'ui.copy.updated': ['componentId'],
};

/**
 * Configuration
 */
interface KairosConfig {
  baseUrl?: string;
  gatewayUrl?: string;
  ingestKey?: string;
  signingSecret?: string;
  enabled?: boolean;
}

let config: KairosConfig = {
  enabled: process.env.NODE_ENV !== 'test',
};

/**
 * Initialize Kairos client configuration
 */
export function initKairosClient(cfg: Partial<KairosConfig> = {}) {
  config = {
    ...config,
    baseUrl: process.env.KAIROS_BASE_URL || cfg.baseUrl,
    gatewayUrl: process.env.KAIROS_EVENT_GATEWAY_URL || cfg.gatewayUrl,
    ingestKey: process.env.KAIROS_INGEST_KEY || cfg.ingestKey,
    signingSecret: process.env.KAIROS_SIGNING_SECRET || cfg.signingSecret,
    enabled: cfg.enabled !== undefined ? cfg.enabled : config.enabled,
  };
}

/**
 * Validate event payload has required fields
 */
function validateEventPayload(
  eventType: KairosEventType,
  payload: Record<string, any>
): { valid: boolean; missing: string[] } {
  const required = REQUIRED_FIELDS[eventType] || [];
  const missing = required.filter(field => !(field in payload));
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Generate dedupe key from event
 */
function generateDedupeKey(
  eventType: KairosEventType,
  payload: Record<string, any>
): string {
  // Use stable fields for deduplication
  const parts: string[] = [eventType];
  
  // Add correlation_id if present
  if (payload.correlation_id) {
    parts.push(payload.correlation_id);
  }
  
  // Add commit_sha if present (for CI events)
  if (payload.commit_sha) {
    parts.push(payload.commit_sha);
  }
  
  // Add task_id if present
  if (payload.task_id) {
    parts.push(payload.task_id);
  }
  
  // Add primary entity IDs
  const idFields = ['messageId', 'threadId', 'memoryId', 'artifactId', 'userId', 'phaseId'];
  for (const field of idFields) {
    if (payload[field]) {
      parts.push(`${field}:${payload[field]}`);
      break; // Only use first matching ID
    }
  }
  
  return parts.join(':');
}

/**
 * Sanitize payload for logging (remove secrets)
 */
function sanitizeForLogging(payload: Record<string, any>): Record<string, any> {
  const sanitized = { ...payload };
  const secretFields = ['apiKey', 'token', 'secret', 'password', 'signature'];
  
  for (const field of secretFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Sign event payload with HMAC (if signing secret provided)
 */
async function signPayload(body: string, secret?: string): Promise<string | undefined> {
  if (!secret) return undefined;
  
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.warn('Failed to sign payload:', error);
    return undefined;
  }
}

/**
 * Send single event to Kairos
 */
export async function sendKairosEvent(
  eventType: KairosEventType,
  payload: Record<string, any>,
  options: {
    correlationId?: string;
    dedupeKey?: string;
    retries?: number;
    authToken?: string;  // Optional: pre-minted IAM token for gateway
  } = {}
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  if (!config.enabled) {
    return { success: true, eventId: 'disabled' };
  }

  // Validate required fields
  const validation = validateEventPayload(eventType, payload);
  if (!validation.valid) {
    const error = `Missing required fields for ${eventType}: ${validation.missing.join(', ')}`;
    console.error(`[Kairos] ${error}`);
    return { success: false, error };
  }

  // Build event payload
  const eventId = uuidv4();
  const eventTime = new Date().toISOString();
  const dedupeKey = options.dedupeKey || generateDedupeKey(eventType, payload);
  const correlationId = options.correlationId || payload.correlation_id;

  const eventPayload: KairosEventPayload = {
    event_id: eventId,
    event_time: eventTime,
    event_type: eventType,
    source: 'pandorasbox',
    correlation_id: correlationId,
    dedupe_key: dedupeKey,
    payload,
  };

  // Determine endpoint:
  // - Prefer gateway when configured (IAM)
  // - Otherwise use Base44 function ingest URL (defaults to https://kairostrack.base44.app/functions/ingest)
  const endpoints = resolveKairosEndpoints(process.env);
  const endpoint = config.gatewayUrl ? `${config.gatewayUrl}/v1/event` : endpoints.ingestUrl;

  // Transform payload format based on endpoint
  // Gateway expects: { action, source, dedupeKey, timestamp, schemaVersion, metadata, ... }
  // Base44 expects: { event_type, source, payload, ... } (or gateway format)
  let transformedPayload: any;
  let body: string;
  
  if (config.gatewayUrl) {
    // Gateway format (matches kairos-intake.ts structure)
    transformedPayload = {
      timestamp: eventTime,
      schemaVersion: 1,
      dedupeKey: dedupeKey,
      source: 'pandorasbox',
      action: eventType,  // Gateway uses 'action' field
      status: 'ok',
      refType: 'event',
      refId: eventId,
      metadata: {
        ...payload,
        event_type: eventType,  // Also include for Base44 compatibility
        correlation_id: correlationId,
      },
    };
    body = JSON.stringify(transformedPayload);
  } else {
    // Direct Base44 format (or gateway-compatible)
    transformedPayload = {
      ...eventPayload,
      // Also include gateway-compatible fields for Base44
      timestamp: eventTime,
      schemaVersion: 1,
      action: eventType,
      dedupeKey: dedupeKey,
      metadata: payload,
    };
    body = JSON.stringify(transformedPayload);
  }

  // Sign if secret provided (gateway handles signing, but we can sign for direct Base44)
  const signature = await signPayload(body, config.signingSecret);

  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Gateway uses IAM auth (GoogleAuth), Base44 uses signature
  if (config.gatewayUrl) {
    // Prefer provided token, then try auto-fetch, then fallback
    if (options.authToken) {
      headers['Authorization'] = `Bearer ${options.authToken}`;
    } else if (typeof window === 'undefined' && typeof process !== 'undefined') {
      try {
        const { GoogleAuth } = require('google-auth-library');
        const auth = new GoogleAuth();
        const client = await auth.getIdTokenClient(config.gatewayUrl);
        const tokenHeaders = await client.getRequestHeaders();
        if (tokenHeaders.Authorization) {
          headers['Authorization'] = tokenHeaders.Authorization;
        }
      } catch (authError) {
        // Fallback: use provided ingestKey if available
        if (config.ingestKey) {
          headers['Authorization'] = `Bearer ${config.ingestKey}`;
        }
        // Log warning but don't fail - caller may provide token via options
        console.warn('[Kairos] Could not auto-get IAM token for gateway, using fallback');
      }
    } else if (config.ingestKey) {
      // Client-side or explicit token provided
      headers['Authorization'] = `Bearer ${config.ingestKey}`;
    }
  } else if (config.ingestKey) {
    headers['Authorization'] = `Bearer ${config.ingestKey}`;
  }

  if (signature && !config.gatewayUrl) {
    // Only sign for direct Base44 calls (gateway signs its own requests)
    headers['X-Signature'] = signature;
  }

  // Retry logic with exponential backoff
  const maxRetries = options.retries ?? 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });

      if (response.ok) {
        const sanitized = sanitizeForLogging(payload);
        console.log(`[Kairos] Event sent: ${eventType} (${eventId})`, sanitized);
        return { success: true, eventId };
      }

      const errorText = await response.text().catch(() => 'Unknown error');
      lastError = new Error(`HTTP ${response.status}: ${errorText}`);
      
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        break;
      }
    } catch (error: any) {
      lastError = error;
    }

    // Exponential backoff: 100ms, 200ms, 400ms
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
    }
  }

  const error = lastError?.message || 'Unknown error';
  const sanitized = sanitizeForLogging(payload);
  console.error(`[Kairos] Failed to send event after ${maxRetries} attempts: ${eventType}`, {
    error,
    payload: sanitized,
  });

  return { success: false, error };
}

/**
 * Send multiple events in batch
 */
export async function sendKairosEvents(
  events: Array<{
    eventType: KairosEventType;
    payload: Record<string, any>;
    options?: { correlationId?: string; dedupeKey?: string };
  }>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const event of events) {
    const result = await sendKairosEvent(
      event.eventType,
      event.payload,
      event.options
    );

    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`${event.eventType}: ${result.error}`);
      }
    }

    // Small delay to avoid overwhelming the endpoint
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return { sent, failed, errors };
}

// Initialize on module load
if (typeof window === 'undefined') {
  // Server-side only
  initKairosClient();
}

