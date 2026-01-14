#!/usr/bin/env tsx
/**
 * Send Deep Research Signal to Kairos
 * 
 * Reads docs/DEEP_RESEARCH_KAIROS_SIGNAL.json and sends it to Kairos gateway.
 * Honors env vars: KAIROS_BASE_URL, KAIROS_INGEST_URL, KAIROS_INGEST_KEY, KAIROS_EVENT_GATEWAY_URL
 * 
 * Usage:
 *   tsx scripts/send-deep-research-signal.ts
 *   npm run kairos:deep-research-signal
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { sendKairosEvent } from '../src/lib/kairosClient';

const SIGNAL_FILE = join(process.cwd(), 'docs', 'DEEP_RESEARCH_KAIROS_SIGNAL.json');
const RAW_FILE = join(process.cwd(), 'docs', 'DEEP_RESEARCH_RAW.md');

interface DeepResearchSignal {
  event_time: string;
  event_type: string;
  actor: string;
  source: string;
  node_id: string;
  confidence: number;
  correlation_id?: string;
  dedupe_key?: string;
  payload: {
    research_version: string;
    sections_analyzed: number;
    key_insights: Record<string, string>;
    actionable_gaps_identified: Array<{
      gap: string;
      evidence: string;
      files: string[];
    }>;
    conflicts_noted?: Record<string, string>;
    evidence_pointers: Record<string, string>;
    next_tasks: Array<{
      task_id: string;
      title: string;
      files: string[];
      acceptance: string;
    }>;
    top_findings?: string[];
    top_gaps?: string[];
  };
}

/**
 * Generate deterministic dedupe key from signal file content + date + node_id
 */
function generateDedupeKey(signal: DeepResearchSignal, rawFileHash?: string): string {
  const components = [
    signal.node_id,
    signal.payload.research_version,
    rawFileHash || 'no-raw-file',
    new Date().toISOString().split('T')[0], // YYYY-MM-DD
  ];
  const input = components.join('|');
  return createHash('sha256').update(input).digest('hex').substring(0, 32);
}

/**
 * Read and hash RAW file if it exists
 */
function getRawFileHash(): string | undefined {
  try {
    const rawContent = readFileSync(RAW_FILE, 'utf-8');
    // Only hash if file has actual content (not just placeholder)
    if (rawContent.length > 500 && !rawContent.includes('[PASTE DEEP RESEARCH RESULTS BELOW THIS LINE]')) {
      return createHash('sha256').update(rawContent).digest('hex').substring(0, 16);
    }
  } catch (error) {
    // File doesn't exist or can't be read - that's ok
  }
  return undefined;
}

/**
 * Main execution
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Deep Research Signal Sender');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Read signal file
  let signal: DeepResearchSignal;
  try {
    const signalContent = readFileSync(SIGNAL_FILE, 'utf-8');
    signal = JSON.parse(signalContent);
    console.log(`✓ Read signal file: ${SIGNAL_FILE}`);
  } catch (error: any) {
    console.error(`✗ Failed to read signal file: ${error.message}`);
    process.exit(1);
  }

  // Get raw file hash for dedupe key
  const rawFileHash = getRawFileHash();
  if (rawFileHash) {
    console.log(`✓ Raw file hash: ${rawFileHash.substring(0, 8)}...`);
  } else {
    console.log(`⚠ Raw file not found or empty: ${RAW_FILE}`);
    console.log(`  (This is ok if raw research hasn't been pasted yet)`);
  }

  // Generate/update dedupe key
  const dedupeKey = generateDedupeKey(signal, rawFileHash);
  signal.dedupe_key = dedupeKey;
  console.log(`✓ Dedupe key: ${dedupeKey}`);

  // Validate event type (cast to KairosEventType)
  const eventType = signal.event_type as any as import('../src/lib/kairosClient').KairosEventType;
  if (!eventType || typeof eventType !== 'string') {
    console.error(`✗ Invalid event_type: ${eventType}`);
    process.exit(1);
  }
  
  // Note: research.deep_plan_ingested is a custom event type for Deep Research signals
  // Added to KairosEventType union in src/lib/kairosClient.ts

  // Extract payload and include node_id (required field)
  const payload = {
    ...signal.payload,
    node_id: signal.node_id, // Required field for research.deep_plan_ingested
  };

  // Send event via Kairos client
  console.log(`\n📤 Sending event: ${eventType}`);
  console.log(`   Node ID: ${signal.node_id}`);
  console.log(`   Confidence: ${signal.confidence}`);
  console.log(`   Research Version: ${payload.research_version}`);
  console.log(`   Sections Analyzed: ${payload.sections_analyzed}`);
  console.log(`   Next Tasks: ${payload.next_tasks.length}`);

  const result = await sendKairosEvent(
    eventType,
    payload,
    {
      correlationId: signal.correlation_id || `deep-research-${payload.research_version}`,
      dedupeKey: dedupeKey,
      retries: 3,
    }
  );

  if (result.success) {
    console.log(`\n✅ Event sent successfully!`);
    console.log(`   Event ID: ${result.eventId}`);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    process.exit(0);
  } else {
    console.error(`\n✗ Failed to send event: ${result.error}`);
    console.error(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };

