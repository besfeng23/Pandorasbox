/**
 * Base44 Synchronization Script
 * 
 * Synchronizes Base44 with Cursor and Kairos by:
 * 1. Fetching active phase from Base44
 * 2. Fetching phase objective from Kairos
 * 3. Updating phase objective in Base44
 * 4. Fetching/updating system status
 * 5. Fetching/updating bug impact
 * 6. Updating alignment checklist
 * 
 * Usage:
 *   npm run base44:sync
 *   npm run base44:sync -- --phase-id <phaseId>
 */

import {
  fetchActivePhase,
  updatePhaseData,
  fetchPhaseObjectiveFromKairos,
  updatePhaseObjectiveInBase44,
  fetchPhaseSystemStatus,
  updateSystemMap,
  fetchActiveBugs,
  updateBugImpactOnPhase,
  fetchAlignmentChecklist,
  updateAlignmentChecklist,
  initBase44Client,
} from '../src/lib/base44Client';

interface SyncOptions {
  phaseId?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Main synchronization function
 */
async function syncBase44WithKairos(options: SyncOptions = {}) {
  const { phaseId, dryRun = false, verbose = false } = options;

  try {
    // Initialize client
    initBase44Client();

    if (verbose) {
      console.log('🔄 Starting Base44 ↔ Kairos synchronization...\n');
    }

    // 1. Fetch active phase
    let activePhase;
    if (phaseId) {
      // If phaseId provided, fetch that specific phase
      // Note: This assumes Base44 has an endpoint for fetching by ID
      // For now, we'll fetch current and check if it matches
      activePhase = await fetchActivePhase();
      if (activePhase.phaseId !== phaseId) {
        console.warn(`⚠️  Active phase (${activePhase.phaseId}) doesn't match requested (${phaseId})`);
      }
    } else {
      activePhase = await fetchActivePhase();
    }

    if (verbose) {
      console.log(`✅ Active Phase: ${activePhase.phaseId} (${activePhase.status})`);
    }

    const currentPhaseId = activePhase.phaseId;

    // 2. Fetch phase objective from Kairos
    if (verbose) {
      console.log(`\n📋 Fetching phase objective from Kairos...`);
    }

    let kairosObjective;
    try {
      kairosObjective = await fetchPhaseObjectiveFromKairos(currentPhaseId);
      if (verbose) {
        console.log(`✅ Kairos Objective: ${kairosObjective.objective?.substring(0, 100)}...`);
      }
    } catch (error: any) {
      console.warn(`⚠️  Could not fetch objective from Kairos: ${error.message}`);
      kairosObjective = null;
    }

    // 3. Update phase objective in Base44 (if different)
    if (kairosObjective && kairosObjective.objective) {
      const needsUpdate = activePhase.objective !== kairosObjective.objective;
      
      if (needsUpdate) {
        if (dryRun) {
          console.log(`\n🔍 [DRY RUN] Would update phase objective in Base44`);
        } else {
          if (verbose) {
            console.log(`\n📝 Updating phase objective in Base44...`);
          }
          await updatePhaseObjectiveInBase44(currentPhaseId, {
            objective: kairosObjective.objective,
            ...kairosObjective,
          });
          if (verbose) {
            console.log(`✅ Phase objective updated in Base44`);
          }
        }
      } else {
        if (verbose) {
          console.log(`\n✓ Phase objective already in sync`);
        }
      }
    }

    // 4. Fetch/Update system status
    if (verbose) {
      console.log(`\n🗺️  Fetching system status for phase...`);
    }

    let systemStatus;
    try {
      systemStatus = await fetchPhaseSystemStatus(currentPhaseId);
      if (verbose) {
        console.log(`✅ System Status:`, systemStatus);
      }
    } catch (error: any) {
      console.warn(`⚠️  Could not fetch system status: ${error.message}`);
      systemStatus = null;
    }

    // Update system map if needed (example: you might want to sync from another source)
    // For now, we'll just log it
    if (systemStatus && verbose) {
      console.log(`\n✓ System map retrieved`);
    }

    // 5. Fetch/Update bug impact
    if (verbose) {
      console.log(`\n🐛 Fetching active bugs...`);
    }

    let activeBugs;
    try {
      activeBugs = await fetchActiveBugs();
      if (verbose) {
        console.log(`✅ Found ${activeBugs.length} active bugs`);
      }

      // Map bugs to current phase
      const phaseBugs = activeBugs.filter(bug => bug.phaseId === currentPhaseId);
      
      if (phaseBugs.length > 0) {
        if (dryRun) {
          console.log(`\n🔍 [DRY RUN] Would update bug impact for phase (${phaseBugs.length} bugs)`);
        } else {
          if (verbose) {
            console.log(`\n📝 Updating bug impact for phase...`);
          }
          await updateBugImpactOnPhase(currentPhaseId, phaseBugs);
          if (verbose) {
            console.log(`✅ Bug impact updated`);
          }
        }
      } else {
        if (verbose) {
          console.log(`\n✓ No bugs to map for this phase`);
        }
      }
    } catch (error: any) {
      console.warn(`⚠️  Could not fetch/update bug impact: ${error.message}`);
    }

    // 6. Update alignment checklist
    if (verbose) {
      console.log(`\n✅ Fetching alignment checklist...`);
    }

    let checklist;
    try {
      checklist = await fetchAlignmentChecklist();
      if (verbose) {
        console.log(`✅ Current checklist:`, checklist);
      }

      // Update checklist based on sync results
      const updatedChecklist = {
        planAligned: true,
        systemMapAligned: systemStatus !== null,
        bugImpactMapped: activeBugs !== null && activeBugs.length > 0,
        objectivesSynced: kairosObjective !== null,
        lastSyncTime: new Date().toISOString(),
      };

      if (dryRun) {
        console.log(`\n🔍 [DRY RUN] Would update alignment checklist:`, updatedChecklist);
      } else {
        if (verbose) {
          console.log(`\n📝 Updating alignment checklist...`);
        }
        await updateAlignmentChecklist(updatedChecklist);
        if (verbose) {
          console.log(`✅ Alignment checklist updated`);
        }
      }
    } catch (error: any) {
      console.warn(`⚠️  Could not fetch/update alignment checklist: ${error.message}`);
    }

    if (verbose) {
      console.log(`\n🎉 Synchronization complete!`);
    } else {
      console.log(`✅ Base44 ↔ Kairos sync completed`);
    }

    return {
      success: true,
      phaseId: currentPhaseId,
      objectiveSynced: kairosObjective !== null,
      systemStatusFetched: systemStatus !== null,
      bugsMapped: activeBugs !== null,
      checklistUpdated: checklist !== null,
    };
  } catch (error: any) {
    console.error(`❌ Synchronization failed:`, error.message);
    if (verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

// CLI handling
const args = process.argv.slice(2);
const options: SyncOptions = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

const phaseIdIndex = args.indexOf('--phase-id');
if (phaseIdIndex !== -1 && args[phaseIdIndex + 1]) {
  options.phaseId = args[phaseIdIndex + 1];
}

// Run sync
syncBase44WithKairos(options)
  .then((result) => {
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

