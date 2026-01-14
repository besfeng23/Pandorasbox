/**
 * Sync All Phases from Kairos to Base44
 * 
 * Fetches all phases from Kairos active plan and creates/updates them in Base44
 */

import {
  initBase44Client,
  updatePhaseData,
  base44Request,
} from '../src/lib/base44Client';
import { resolveKairosEndpoints } from '../src/lib/kairosEndpoints';
import type { Base44Phase } from '../src/lib/base44Client';

interface SyncOptions {
  verbose?: boolean;
  dryRun?: boolean;
}

async function syncAllKairosPhases(options: SyncOptions = {}) {
  const { verbose = true, dryRun = false } = options;

  try {
    // Initialize Base44 client
    await initBase44Client();

    if (verbose) {
      console.log('🔄 Fetching all phases from Kairos...\n');
    }

    // Fetch active plan from Kairos
    const endpoints = resolveKairosEndpoints(process.env);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth if available
    if (process.env.BASE44_API_KEY) {
      headers['api_key'] = process.env.BASE44_API_KEY;
    }

    const response = await fetch(endpoints.activePlanUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Kairos API error (${response.status}): ${errorText}`);
    }

    const activePlan = await response.json();
    const planJson = activePlan?.plan?.plan_json || activePlan?.plan_json || activePlan;

    if (verbose) {
      console.log('✅ Fetched active plan from Kairos\n');
    }

    // Extract phases from plan
    const phases: Array<{ id: string; phaseId: string; objective?: string; description?: string; title?: string; status?: string; [key: string]: any }> = [];

    // 1. Check phaseRegistry (from kairos_masterplan_v2.json contract structure)
    if (planJson?.phaseRegistry && Array.isArray(planJson.phaseRegistry)) {
      planJson.phaseRegistry.forEach((phase: any) => {
        const phaseId = phase.phaseId?.toString() || phase.id?.toString();
        if (phaseId) {
          phases.push({
            id: phaseId,
            phaseId: phaseId,
            objective: phase.objective || phase.description || phase.name,
            description: phase.description || phase.objective || phase.name,
            title: phase.title || phase.name || phase.description || phase.objective,
            status: phase.status || 'pending',
            ...phase,
          });
        }
      });
    }

    // 2. Check masterPlan.phaseRegistry (nested structure)
    if (planJson?.masterPlan?.phaseRegistry && Array.isArray(planJson.masterPlan.phaseRegistry)) {
      planJson.masterPlan.phaseRegistry.forEach((phase: any) => {
        const phaseId = phase.phaseId?.toString() || phase.id?.toString();
        if (phaseId) {
          // Check if already added
          const existing = phases.find(p => p.phaseId === phaseId);
          if (!existing) {
            phases.push({
              id: phaseId,
              phaseId: phaseId,
              objective: phase.objective || phase.description || phase.name,
              description: phase.description || phase.objective || phase.name,
              title: phase.title || phase.name || phase.description || phase.objective,
              status: phase.status || 'pending',
              ...phase,
            });
          }
        }
      });
    }

    // 3. Try different plan structures (phases object/array)
    if (planJson?.phases) {
      // Structure: plan.phases is an object or array
      if (Array.isArray(planJson.phases)) {
        planJson.phases.forEach((phase: any) => {
          const phaseId = phase.phaseId?.toString() || phase.id?.toString() || phase.nodeId;
          if (phaseId) {
            const existing = phases.find(p => p.phaseId === phaseId);
            if (!existing) {
              phases.push({
                id: phaseId,
                phaseId: phaseId,
                objective: phase.objective || phase.description || phase.title,
                description: phase.description || phase.objective || phase.title,
                title: phase.title || phase.description || phase.objective,
                status: phase.status || 'pending',
                ...phase,
              });
            }
          }
        });
      } else if (typeof planJson.phases === 'object') {
        Object.entries(planJson.phases).forEach(([key, phase]: [string, any]) => {
          const phaseId = (phase.phaseId?.toString() || phase.id?.toString() || phase.nodeId || key);
          if (phaseId) {
            const existing = phases.find(p => p.phaseId === phaseId);
            if (!existing) {
              phases.push({
                id: phaseId,
                phaseId: phaseId,
                objective: phase.objective || phase.description || phase.title,
                description: phase.description || phase.objective || phase.title,
                title: phase.title || phase.description || phase.objective,
                status: phase.status || 'pending',
                ...phase,
              });
            }
          }
        });
      }
    }

    // 4. Also check nodes for phase-type nodes
    if (planJson?.nodes) {
      const phaseNodes = Array.isArray(planJson.nodes)
        ? planJson.nodes.filter((n: any) => n.type === 'phase' || n.nodeType === 'phase' || n.id?.startsWith('phase-') || n.nodeId?.startsWith('phase-'))
        : Object.values(planJson.nodes).filter((n: any) => n.type === 'phase' || n.nodeType === 'phase' || n.id?.startsWith('phase-') || n.nodeId?.startsWith('phase-'));

      phaseNodes.forEach((node: any) => {
        const phaseId = (node.phaseId?.toString() || node.id?.toString() || node.nodeId);
        if (phaseId) {
          // Check if already added
          const existing = phases.find(p => p.phaseId === phaseId);
          if (!existing) {
            phases.push({
              id: phaseId,
              phaseId: phaseId,
              objective: node.objective || node.description || node.title,
              description: node.description || node.objective || node.title,
              title: node.title || node.description || node.objective,
              status: node.status || 'pending',
              ...node,
            });
          }
        }
      });
    }

    // 5. Check masterPlan.nodes for phase-type nodes
    if (planJson?.masterPlan?.nodes) {
      const phaseNodes = Array.isArray(planJson.masterPlan.nodes)
        ? planJson.masterPlan.nodes.filter((n: any) => n.type === 'phase' || n.nodeType === 'phase' || n.id?.startsWith('phase-') || n.nodeId?.startsWith('phase-'))
        : Object.values(planJson.masterPlan.nodes).filter((n: any) => n.type === 'phase' || n.nodeType === 'phase' || n.id?.startsWith('phase-') || n.nodeId?.startsWith('phase-'));

      phaseNodes.forEach((node: any) => {
        const phaseId = (node.phaseId?.toString() || node.id?.toString() || node.nodeId);
        if (phaseId) {
          const existing = phases.find(p => p.phaseId === phaseId);
          if (!existing) {
            phases.push({
              id: phaseId,
              phaseId: phaseId,
              objective: node.objective || node.description || node.title,
              description: node.description || node.objective || node.title,
              title: node.title || node.description || node.objective,
              status: node.status || 'pending',
              ...node,
            });
          }
        }
      });
    }

    if (phases.length === 0) {
      console.warn('⚠️  No phases found in Kairos plan');
      if (verbose) {
        console.log('Plan structure:', JSON.stringify(planJson, null, 2).substring(0, 500));
      }
      return;
    }

    if (verbose) {
      console.log(`✅ Found ${phases.length} phase(s) in Kairos plan\n`);
    }

    // Get existing phases from Base44
    const existingPhases = await base44Request<Base44Phase[]>('Phase');
    const existingPhaseMap = new Map<string, Base44Phase>();
    if (Array.isArray(existingPhases)) {
      existingPhases.forEach((p: Base44Phase) => {
        if (p.phaseId) {
          existingPhaseMap.set(p.phaseId, p);
        }
      });
    }

    // Sync each phase to Base44
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const kairosPhase of phases) {
      const phaseId = kairosPhase.phaseId || kairosPhase.id;
      if (!phaseId) {
        if (verbose) {
          console.warn(`⚠️  Skipping phase without ID:`, kairosPhase);
        }
        skipped++;
        continue;
      }

      const existing = existingPhaseMap.get(phaseId);
      
      // Map Kairos status to Base44 status format
      let base44Status: 'active' | 'completed' | 'pending' = 'pending';
      const kairosStatus = (kairosPhase.status || existing?.status || 'pending').toLowerCase();
      if (kairosStatus === 'completed' || kairosStatus === 'done' || kairosStatus === 'finished') {
        base44Status = 'completed';
      } else if (kairosStatus === 'in_progress' || kairosStatus === 'in-progress' || kairosStatus === 'active') {
        base44Status = 'active';
      } else {
        base44Status = 'pending';
      }

      const phaseData: Partial<Base44Phase> = {
        phaseId,
        status: base44Status,
        objective: kairosPhase.objective || kairosPhase.description || kairosPhase.title || existing?.objective,
        // Include additional fields from Kairos phase
        ...(kairosPhase.name && { name: kairosPhase.name }),
        ...(kairosPhase.title && { title: kairosPhase.title }),
        ...(kairosPhase.description && { description: kairosPhase.description }),
      };

      if (verbose) {
        console.log(`\n📋 Processing phase: ${phaseId}`);
        console.log(`   Objective: ${phaseData.objective?.substring(0, 60)}...`);
      }

      if (dryRun) {
        if (existing) {
          console.log(`   [DRY RUN] Would update phase: ${phaseId}`);
        } else {
          console.log(`   [DRY RUN] Would create phase: ${phaseId}`);
        }
        continue;
      }

      try {
        if (existing && existing.id) {
          // Update existing phase using Base44 entity ID
          await base44Request<Base44Phase>('Phase', {
            method: 'PUT',
            entityId: existing.id,
            body: {
              ...existing,
              ...phaseData,
            },
          });
          updated++;
          if (verbose) {
            console.log(`   ✅ Updated phase: ${phaseId} (Base44 ID: ${existing.id})`);
          }
        } else {
          // Create new phase
          const createdPhase = await base44Request<Base44Phase>('Phase', {
            method: 'POST',
            body: phaseData,
          });
          created++;
          if (verbose) {
            console.log(`   ✅ Created phase: ${phaseId}${createdPhase.id ? ` (Base44 ID: ${createdPhase.id})` : ''}`);
          }
        }
      } catch (error: any) {
        console.error(`   ❌ Error syncing phase ${phaseId}: ${error.message}`);
        if (verbose) {
          console.error(`   Error details:`, error);
        }
        skipped++;
      }
    }

    if (verbose) {
      console.log(`\n\n📊 Sync Summary:`);
      console.log(`   ✅ Created: ${created}`);
      console.log(`   ✅ Updated: ${updated}`);
      console.log(`   ⚠️  Skipped: ${skipped}`);
      console.log(`   📋 Total: ${phases.length}`);
    }

    console.log(`\n🎉 Phase sync complete!`);
  } catch (error: any) {
    console.error(`❌ Sync failed:`, error.message);
    if (verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Export for use in other scripts
export { syncAllKairosPhases };

// CLI handling
const args = process.argv.slice(2);
const options: SyncOptions = {
  verbose: args.includes('--verbose') || args.includes('-v') || !args.includes('--quiet'),
  dryRun: args.includes('--dry-run'),
};

syncAllKairosPhases(options)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

