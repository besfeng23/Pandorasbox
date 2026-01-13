/** @jest-environment node */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { cliMain } from '../../scripts/kairos/publish';
import {
  buildStabilizationRegisterPayload,
  validateStabilizationPlanContract,
  runKairosPublish,
  KairosPublishError,
} from '../../scripts/kairos/publish-lib';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kairos-publish-'));
}

describe('kairos publish', () => {
  test('unit: publish payload validation + build payload', () => {
    const plan = validateStabilizationPlanContract({
      sprintName: 'Sprint X',
      bugClusters: [{ id: 1 }],
      fixSequence: ['a', 'b'],
      gatingRules: [{ gate: true }],
      regressionChecklist: ['r1'],
      rollbackStrategy: { type: 'revert' },
    });

    const payload = buildStabilizationRegisterPayload(plan, '2026-01-13T00:00:00.000Z', 'pandorasbox');
    expect(payload.sprintName).toBe('Sprint X');
    expect(payload.registeredAt).toBe('2026-01-13T00:00:00.000Z');
    expect(payload.source).toBe('pandorasbox');
    expect(Array.isArray(payload.bugClusters)).toBe(true);
    expect(Array.isArray(payload.gatingRules)).toBe(true);
  });

  test('unit: missing contract fails fast', async () => {
    const logs: string[] = [];
    const errors: string[] = [];
    const res = await runKairosPublish({
      mode: 'stabilization.register',
      dryRun: true,
      baseUrl: 'https://kairostrack.base44.app',
      contractPath: path.join(makeTempDir(), 'missing.json'),
      nowIso: '2026-01-13T00:00:00.000Z',
    }, {
      logger: {
        log: (m: any) => logs.push(String(m)),
        warn: (m: any) => logs.push(String(m)),
        error: (m: any) => errors.push(String(m)),
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBeInstanceOf(KairosPublishError);
      expect(res.error.code).toBe('CONTRACT_NOT_FOUND');
    }
  });

  test('unit: dry-run prints diagnostics and exits 0', async () => {
    const dir = makeTempDir();
    const contractPath = path.join(dir, 'stabilization.json');
    fs.writeFileSync(
      contractPath,
      JSON.stringify({
        sprintName: 'Dry Run Sprint',
        bugClusters: [],
        fixSequence: [],
        gatingRules: [],
      })
    );

    const logs: string[] = [];
    const errors: string[] = [];

    const res = await runKairosPublish(
      {
        mode: 'stabilization.register',
        dryRun: true,
        baseUrl: 'https://kairostrack.base44.app',
        contractPath,
        nowIso: '2026-01-13T00:00:00.000Z',
      },
      {
        repoRoot: dir,
        logger: {
          log: (m: any) => logs.push(String(m)),
          warn: (m: any) => logs.push(String(m)),
          error: (m: any) => errors.push(String(m)),
        },
      }
    );

    expect(res.ok).toBe(true);
    expect(errors.length).toBe(0);
    const joined = logs.join('\n');
    expect(joined).toContain('Kairos Publish Diagnostics');
    expect(joined).toContain('resolved base url');
    expect(joined).toContain('contract sha256');
    expect(joined).toContain('dry run             : true');
  });

  test('cli: --dry-run returns 0 for valid contract', async () => {
    const dir = makeTempDir();
    const contractPath = path.join(dir, 'stabilization.json');
    fs.writeFileSync(
      contractPath,
      JSON.stringify({
        sprintName: 'CLI Dry Run Sprint',
        bugClusters: [],
        fixSequence: [],
        gatingRules: [],
      })
    );

    const exit = await cliMain(
      ['--dry-run', '--base-url', 'https://kairostrack.base44.app', '--contract', contractPath],
      {}
    );
    expect(exit).toBe(0);
  });
});


