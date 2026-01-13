/**
 * Kairos Event Simulation Script
 * 
 * Reads kairos_masterplan_v2 and emits sample events for 1-2 tasks across phases.
 * Verifies Kairos accepts them (HTTP 200) and returns accepted count.
 * Prints curl equivalents for manual testing.
 * 
 * Usage:
 *   npm run kairos:simulate
 * 
 * Environment Variables:
 *   KAIROS_BASE_URL or KAIROS_EVENT_GATEWAY_URL (required)
 *   KAIROS_INGEST_URL (optional; overrides `${KAIROS_BASE_URL}/functions/ingest`)
 *   KAIROS_INGEST_KEY (optional)
 *   KAIROS_SIGNING_SECRET (optional)
 */

import fs from 'fs';
import path from 'path';
import { sendKairosEvent, initKairosClient } from '../src/lib/kairosClient';
import { resolveKairosEndpoints } from '../src/lib/kairosEndpoints';
import { GoogleAuth } from 'google-auth-library';

const REPO_ROOT = process.cwd();
const MASTERPLAN_PATH = path.join(REPO_ROOT, 'tesy'); // PRD file contains masterplan

interface MasterPlanNode {
  nodeId: string;
  title: string;
  eventMappings?: Array<{
    type: string;
    payloadMatch: string[];
    updates?: Record<string, any>;
  }>;
}

interface MasterPlan {
  masterPlan?: {
    nodes?: MasterPlanNode[];
  };
}

/**
 * Read masterplan JSON (extracted from PRD or separate file)
 */
function readMasterPlan(): MasterPlan | null {
  // Try to read from tesy file (PRD) - it contains the masterplan JSON
  if (fs.existsSync(MASTERPLAN_PATH)) {
    try {
      const content = fs.readFileSync(MASTERPLAN_PATH, 'utf-8');
      // Extract JSON from the file (it's embedded in the PRD)
      // For now, we'll use a simplified approach - you may need to extract the JSON portion
      // This is a placeholder - adjust based on actual file structure
      console.log('⚠️  Masterplan extraction from PRD not implemented. Using sample events.');
      return null;
    } catch (error: any) {
      console.error(`Failed to read masterplan: ${error.message}`);
      return null;
    }
  }
  
  return null;
}

/**
 * Generate sample events based on masterplan eventMappings
 */
function generateSampleEvents(): Array<{
  eventType: string;
  payload: Record<string, any>;
  description: string;
}> {
  const now = new Date().toISOString();
  const sampleUserId = 'sample_user_123';
  const sampleThreadId = 'sample_thread_456';
  const sampleMessageId = 'sample_message_789';
  
  return [
    {
      eventType: 'ui.chat.message_sent',
      payload: {
        threadId: sampleThreadId,
        messageId: sampleMessageId,
        userId: sampleUserId,
        timestamp: now,
      },
      description: 'User sends a message in chat',
    },
    {
      eventType: 'system.lane.chat.started',
      payload: {
        threadId: sampleThreadId,
        messageId: sampleMessageId,
        userId: sampleUserId,
        timestamp: now,
      },
      description: 'Chat lane orchestrator starts processing',
    },
    {
      eventType: 'system.lane.memory.created',
      payload: {
        memoryId: 'sample_memory_001',
        userId: sampleUserId,
        timestamp: now,
      },
      description: 'Memory lane creates a memory entry',
    },
    {
      eventType: 'system.memory.persisted',
      payload: {
        memoryId: 'sample_memory_001',
        userId: sampleUserId,
        timestamp: now,
      },
      description: 'Memory persisted to Firestore',
    },
    {
      eventType: 'system.lane.answer.retrieval_done',
      payload: {
        resultCount: 5,
        userId: sampleUserId,
        timestamp: now,
      },
      description: 'Answer lane completes context retrieval',
    },
    {
      eventType: 'system.lane.answer.completed',
      payload: {
        assistantMessageId: 'sample_assistant_001',
        threadId: sampleThreadId,
        userId: sampleUserId,
        timestamp: now,
      },
      description: 'Answer lane completes response generation',
    },
    {
      eventType: 'system.chat.response_completed',
      payload: {
        threadId: sampleThreadId,
        assistantMessageId: 'sample_assistant_001',
        userId: sampleUserId,
        timestamp: now,
      },
      description: 'Chat response completed and visible to user',
    },
    {
      eventType: 'system.thread.persisted',
      payload: {
        threadId: sampleThreadId,
        userId: sampleUserId,
        timestamp: now,
      },
      description: 'Thread persisted to Firestore',
    },
    {
      eventType: 'system.embedding.generated',
      payload: {
        entityType: 'message',
        entityId: sampleMessageId,
        userId: sampleUserId,
        timestamp: now,
      },
      description: 'Embedding generated for message',
    },
    {
      eventType: 'system.search.completed',
      payload: {
        query: 'sample search query',
        latencyMs: 250,
        userId: sampleUserId,
        timestamp: now,
      },
      description: 'Vector search completed',
    },
  ];
}

/**
 * Generate curl command for manual testing
 */
function generateCurlCommand(
  eventType: string,
  payload: Record<string, any>,
  endpoint: string,
  ingestKey?: string,
  mode: 'base44' | 'gateway' = 'base44'
): string {
  const nowIso = new Date().toISOString();
  const eventPayload =
    mode === 'gateway'
      ? {
          timestamp: nowIso,
          schemaVersion: 1,
          dedupeKey: `simulate:${eventType}:${Date.now()}`,
          source: 'pandorasbox',
          action: eventType,
          status: 'ok',
          refType: 'event',
          refId: 'sample_event_id',
          metadata: {
            ...payload,
            event_type: eventType,
          },
        }
      : {
          event_id: 'sample_event_id',
          event_time: nowIso,
          event_type: eventType,
          source: 'pandorasbox',
          payload,
        };

  const body =
    mode === 'base44'
      ? // Base44 ingest accepts BOTH:
        // - Single event object
        // - Batch wrapper: { events: [event, ...] }
        // For simulation we emit the batch-wrapper form to match production ingest usage.
        JSON.stringify({ events: [eventPayload] })
      : JSON.stringify(eventPayload);
  const headers: string[] = ["'Content-Type: application/json'"];
  
  if (ingestKey) {
    headers.push(`'Authorization: Bearer ${ingestKey}'`);
  }

  return `curl -X POST ${endpoint} \\
  -H ${headers.join(' -H ')} \\
  -d '${body.replace(/'/g, "'\\''")}'`;
}

async function main() {
  console.log('🎯 Kairos Event Simulation');
  console.log('');

  // Initialize client
  initKairosClient();
  const endpoints = resolveKairosEndpoints(process.env);
  
  const gatewayUrl = process.env.KAIROS_EVENT_GATEWAY_URL;
  const baseUrl = process.env.KAIROS_BASE_URL;
  
  if (!gatewayUrl && !baseUrl) {
    console.error('❌ KAIROS_BASE_URL or KAIROS_EVENT_GATEWAY_URL must be set');
    console.error('');
    console.error('   Example:');
    console.error('     KAIROS_EVENT_GATEWAY_URL=https://kairos-event-gateway-xxx.run.app npm run kairos:simulate');
    process.exit(1);
  }

  const endpoint = gatewayUrl ? `${gatewayUrl}/v1/event` : endpoints.ingestUrl;
  console.log(`📍 Endpoint: ${endpoint}`);
  if (gatewayUrl) {
    console.log('   Using Event Gateway (IAM auth)');
  } else {
    console.log('   Using direct Base44 (signature auth)');
  }
  console.log('');

  // Get IAM token for gateway if needed
  let authToken: string | undefined;
  if (gatewayUrl) {
    try {
      const auth = new GoogleAuth();
      const client = await auth.getIdTokenClient(gatewayUrl);
      const headers = await client.getRequestHeaders();
      authToken = headers.Authorization?.replace('Bearer ', '');
      if (authToken) {
        console.log('✅ Got IAM token for gateway');
      }
    } catch (error: any) {
      console.warn(`⚠️  Could not get IAM token: ${error.message}`);
      console.warn('   You may need to run: gcloud auth application-default login');
      console.warn('   Or set GOOGLE_ID_TOKEN environment variable');
    }
    console.log('');
  }

  // Read masterplan (optional - for future enhancement)
  const masterplan = readMasterPlan();
  if (masterplan) {
    console.log('✅ Masterplan loaded');
  } else {
    console.log('⚠️  Using sample events (masterplan extraction not implemented)');
  }
  console.log('');

  // Generate sample events
  const events = generateSampleEvents();
  console.log(`📊 Generated ${events.length} sample events`);
  console.log('');

  // Send events
  console.log('📤 Sending events...');
  let successCount = 0;
  let failCount = 0;
  const curlCommands: string[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const progress = `[${i + 1}/${events.length}]`;
    
    process.stdout.write(`   ${progress} ${event.eventType}... `);

    try {
      const result = await sendKairosEvent(
        event.eventType as any,
        event.payload,
        { 
          retries: 1, // Single attempt for simulation
          authToken: authToken, // Pass IAM token for gateway
        }
      );

      if (result.success) {
        successCount++;
        console.log('✅');
      } else {
        failCount++;
        console.log(`❌ (${result.error})`);
      }

      // Generate curl command
      const curl = generateCurlCommand(
        event.eventType,
        event.payload,
        endpoint,
        process.env.KAIROS_INGEST_KEY,
        gatewayUrl ? 'gateway' : 'base44'
      );
      curlCommands.push(`# ${event.description}\n${curl}\n`);
    } catch (error: any) {
      failCount++;
      console.log(`❌ (${error.message})`);
    }

    // Small delay
    if (i < events.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log('');
  console.log('📊 Results:');
  console.log(`   ✅ Sent: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('');

  // Print curl commands
  if (curlCommands.length > 0) {
    console.log('📋 Curl Commands for Manual Testing:');
    console.log('');
    curlCommands.forEach(cmd => {
      console.log(cmd);
    });
  }

  // Verification instructions
  console.log('');
  console.log('🔍 Verification Steps:');
  console.log('   1. Check Kairos Live Activity dashboard for events');
  console.log('   2. Verify at least one task_state changes in Kairos');
  console.log('   3. Confirm events appear in event log');
  console.log('');

  if (failCount === 0) {
    console.log('✅ All events sent successfully');
    process.exit(0);
  } else {
    console.log(`⚠️  ${failCount} events failed`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});

