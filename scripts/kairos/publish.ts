#!/usr/bin/env tsx
/**
 * Kairos Publish (production-grade)
 *
 * Features:
 * - --dry-run: validate env + contract + payload, print diagnostics, no request
 * - strict validations: base url, contract exists/non-empty, JSON parse, shape
 * - retry logic: 3 retries w/ exponential backoff; no retry on 4xx except 429
 * - correct exit codes for CI
 *
 * Usage:
 *   pnpm kairos:publish -- --dry-run
 *   pnpm kairos:publish -- --contract contracts/kairos/stabilization_sprint_plan.json
 *   pnpm kairos:publish -- --base-url https://kairostrack.base44.app
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { runKairosPublish, type PublishCliOptions } from './publish-lib';

const DEFAULT_BASE_URL = 'https://kairostrack.base44.app';
const DEFAULT_CONTRACT = path.join('contracts', 'kairos', 'stabilization_sprint_plan.json');

type ParsedArgs = {
  dryRun: boolean;
  baseUrl?: string;
  contractPath?: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (a === '--base-url') {
      out.baseUrl = argv[i + 1];
      i++;
      continue;
    }
    if (a === '--contract' || a === '--contract-path') {
      out.contractPath = argv[i + 1];
      i++;
      continue;
    }
    if (a === '--help' || a === '-h') {
      printHelpAndExit(0);
    }
  }
  return out;
}

function printHelpAndExit(code: number): never {
  // Keep help minimal and shell-agnostic
  console.log(`
Kairos Publish

Options:
  --dry-run                 Validate + print diagnostics, do not send request
  --base-url <url>          Override KAIROS_BASE_URL (default: ${DEFAULT_BASE_URL})
  --contract <path>         Contract JSON path (default: ${DEFAULT_CONTRACT})

Environment:
  KAIROS_BASE_URL           Base URL for Kairos (optional; defaults to ${DEFAULT_BASE_URL})

Examples:
  pnpm kairos:publish -- --dry-run
  pnpm kairos:publish -- --contract ${DEFAULT_CONTRACT}
`);
  process.exit(code);
}

export async function cliMain(argv: string[], env: NodeJS.ProcessEnv): Promise<number> {
  const args = parseArgs(argv);

  const options: PublishCliOptions = {
    mode: 'stabilization.register',
    dryRun: args.dryRun,
    baseUrl: (args.baseUrl ?? env.KAIROS_BASE_URL ?? DEFAULT_BASE_URL).trim(),
    contractPath: args.contractPath ?? DEFAULT_CONTRACT,
    ingestKey: env.KAIROS_INGEST_KEY,
    signingSecret: env.KAIROS_SIGNING_SECRET,
    source: 'pandorasbox',
  };

  const result = await runKairosPublish(options);
  if (!result.ok) return 1;
  return 0;
}

async function main() {
  const exitCode = await cliMain(process.argv.slice(2), process.env);
  process.exit(exitCode);
}

// Run only when invoked as a script (not when imported by tests)
const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (pathToFileURL(invoked).pathname === pathToFileURL(thisFile).pathname) {
  main().catch((err: any) => {
    console.error('❌ Fatal error:', err?.message ?? String(err));
    process.exit(1);
  });
}


