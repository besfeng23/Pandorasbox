#!/usr/bin/env tsx
/**
 * Prints available config keys (never values).
 *
 * Usage:
 *   npm run secrets:check
 */

import { getConfig } from '@/lib/runtime/secrets';

async function main() {
  const cfg = await getConfig();
  const keys = Object.keys(cfg).sort();
  // Keys only; values can contain secrets.
  process.stdout.write(keys.join('\n') + '\n');
}

main().catch((err) => {
  console.error('secrets:check failed');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});


