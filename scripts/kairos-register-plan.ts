/* eslint-disable no-console */
/**
 * Track A: Register Master Plan (Base44 function endpoint)
 *
 * Posts the masterplan to Base44 Kairos so it can aggregate ingested events into rollups.
 *
 * Env:
 * - KAIROS_PLAN_REGISTER_URL (optional; full override)
 * - KAIROS_ACTIVE_PLAN_URL (optional; full override)
 * - KAIROS_BASE_URL (optional; used to derive defaults)
 * - KAIROS_INGEST_KEY (optional; bearer auth)
 */

import crypto from 'crypto';
import { resolveKairosEndpoints } from '../src/lib/kairosEndpoints';
import { SAMPLE_MASTERPLAN } from './kairos/masterplan.sample';

async function main() {
  const endpoints = resolveKairosEndpoints(process.env);
  const url = endpoints.planRegisterUrl;

  const body = JSON.stringify(SAMPLE_MASTERPLAN);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const ingestKey = (process.env.KAIROS_INGEST_KEY ?? '').trim();
  if (ingestKey) {
    headers.Authorization = `Bearer ${ingestKey}`;
  }

  const signingSecret = (process.env.KAIROS_SIGNING_SECRET ?? '').trim();
  if (signingSecret) {
    // Keep consistent with other scripts (HMAC base64)
    const signature = crypto.createHmac('sha256', signingSecret).update(body, 'utf8').digest('base64');
    headers['X-Signature'] = signature;
  }

  console.log('📋 Kairos Track A: Register Master Plan');
  console.log(`📍 POST ${url}`);
  console.log(`🧾 Plan version: ${SAMPLE_MASTERPLAN.masterPlan?.version ?? 'unknown'}`);
  console.log(`🧩 Nodes: ${SAMPLE_MASTERPLAN.masterPlan?.nodes?.length ?? 0}`);
  console.log('');

  const res = await fetch(url, { method: 'POST', headers, body });
  const text = await res.text().catch(() => '');

  if (!res.ok) {
    const hint =
      res.status === 404 || res.status === 501 || res.status === 405
        ? 'Base44 function endpoint may not be deployed yet (expected: /functions/kairosRegisterPlan).'
        : '';
    console.error(`❌ Failed: HTTP ${res.status} ${res.statusText}`);
    if (hint) console.error(`   ${hint}`);
    if (text) console.error(`   Body: ${text.slice(0, 1200)}`);
    process.exit(1);
  }

  console.log('✅ Plan registered');
  if (text) console.log(`   Response: ${text.slice(0, 1200)}`);
  console.log('');
  console.log(`🔎 Next: GET ${endpoints.activePlanUrl}`);
}

main().catch((err: any) => {
  console.error('❌ Fatal error:', err?.message ?? String(err));
  process.exit(1);
});


