/**
 * Backwards-compatible wrapper for the new production-grade publish CLI.
 *
 * Prefer: `pnpm kairos:publish`
 * Still supported: `pnpm kairos:register:stabilization`
 */

import { cliMain } from './kairos/publish';

async function main() {
  const exitCode = await cliMain(process.argv.slice(2), process.env);
  process.exit(exitCode);
}

main().catch((err: any) => {
  console.error('❌ Fatal error:', err?.message ?? String(err));
  process.exit(1);
});

