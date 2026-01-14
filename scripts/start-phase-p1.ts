/**
 * Start Phase P1 (Foundation & Infra) and Track in Kairos
 * 
 * This script:
 * 1. Updates P1 status in Firestore system_phases collection
 * 2. Emits Kairos events to track phase progress
 * 3. Verifies tracking is working
 * 
 * Usage:
 *   npm run start:p1
 *   OR
 *   tsx scripts/start-phase-p1.ts
 */

import admin from 'firebase-admin';
import { config } from 'dotenv';
import path from 'path';
import { sendKairosEvent, initKairosClient } from '../src/lib/kairosClient';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  // Priority 1: Service account from environment variable
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      console.log('✅ Initializing Firebase Admin with FIREBASE_SERVICE_ACCOUNT_KEY...');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      return admin.firestore();
    } catch (error: any) {
      console.warn('⚠️  Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error.message);
    }
  }

  // Priority 2: Local service account file
  const fs = require('fs');
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      console.log('✅ Initializing Firebase Admin with service-account.json...');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      return admin.firestore();
    } catch (error: any) {
      console.warn('⚠️  Failed to load service-account.json:', error.message);
    }
  }

  // Priority 3: Application Default Credentials
  try {
    console.log('✅ Initializing Firebase Admin with Application Default Credentials...');
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      ...(projectId && { projectId }),
    });
    return admin.firestore();
  } catch (error: any) {
    throw new Error(`Failed to initialize Firebase Admin: ${error.message}`);
  }
}

// Phase P1 definition from master plan
const PHASE_P1 = {
  id: 'P1',
  phaseId: 1,
  title: 'Foundation & Infra',
  objective: 'Establish core infrastructure, environments, and CI/CD.',
  ui_ux: ['Base layout', 'Auth screens', 'Loading states'],
  backend: ['Firebase project', 'Firestore schema', 'Auth setup'],
  infra: ['Vercel', 'Cloud Run', 'Secrets management'],
  exit_criteria: ['Deploy succeeds', 'Auth works', 'Env separation complete'],
};

/**
 * Update P1 phase status in Firestore
 */
async function updatePhaseInFirestore(db: admin.firestore.Firestore, status: string) {
  console.log(`📝 Updating P1 phase status to: ${status}`);
  
  const phaseRef = db.collection('system_phases').doc('phase_1');
  
  // Check if phase exists
  const phaseDoc = await phaseRef.get();
  const phaseData = phaseDoc.exists ? phaseDoc.data() : null;
  
  const updateData: any = {
    id: PHASE_P1.phaseId,
    phaseId: PHASE_P1.phaseId,
    title: PHASE_P1.title,
    description: PHASE_P1.objective,
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    metrics: {
      ui_ux_tasks: PHASE_P1.ui_ux.length,
      backend_tasks: PHASE_P1.backend.length,
      infra_tasks: PHASE_P1.infra.length,
      exit_criteria_count: PHASE_P1.exit_criteria.length,
    },
  };

  if (!phaseDoc.exists) {
    updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    await phaseRef.set(updateData);
    console.log('✅ Created P1 phase document in Firestore');
  } else {
    await phaseRef.update(updateData);
    console.log('✅ Updated P1 phase document in Firestore');
  }

  return phaseRef.id;
}

/**
 * Emit Kairos events for phase tracking
 */
async function emitKairosEvents(phaseId: number, status: string) {
  console.log('📤 Emitting Kairos events...');
  
  // Initialize Kairos client
  initKairosClient();
  
  const correlationId = `phase-p1-${Date.now()}`;
  const dedupeKey = `phase-p1-${status}-${Date.now()}`;

  // Event 1: Phase persisted (if first time)
  if (status === 'in_progress') {
    const persistedResult = await sendKairosEvent(
      'system.phase.persisted',
      {
        phaseId: phaseId.toString(),
        title: PHASE_P1.title,
        objective: PHASE_P1.objective,
      },
      {
        correlationId,
        dedupeKey: `phase-p1-persisted-${Date.now()}`,
      }
    );

    if (persistedResult.success) {
      console.log('   ✅ system.phase.persisted event sent');
    } else {
      console.log(`   ⚠️  system.phase.persisted failed: ${persistedResult.error}`);
    }
  }

  // Event 2: Phase updated (status change)
  const updatedResult = await sendKairosEvent(
    'system.phase.updated',
    {
      phaseId: phaseId.toString(),
      status,
      title: PHASE_P1.title,
      metrics: {
        ui_ux_tasks: PHASE_P1.ui_ux.length,
        backend_tasks: PHASE_P1.backend.length,
        infra_tasks: PHASE_P1.infra.length,
      },
    },
    {
      correlationId,
      dedupeKey,
    }
  );

  if (updatedResult.success) {
    console.log('   ✅ system.phase.updated event sent');
    console.log(`   📍 Event ID: ${updatedResult.eventId}`);
  } else {
    console.log(`   ⚠️  system.phase.updated failed: ${updatedResult.error}`);
  }

  return { persisted: status === 'in_progress', updated: updatedResult.success };
}

/**
 * Verify tracking by checking Firestore and Kairos
 */
async function verifyTracking(db: admin.firestore.Firestore) {
  console.log('\n🔍 Verifying tracking...');
  
  // Check Firestore
  const phaseRef = db.collection('system_phases').doc('phase_1');
  const phaseDoc = await phaseRef.get();
  
  if (phaseDoc.exists) {
    const data = phaseDoc.data();
    console.log('   ✅ Firestore: Phase document exists');
    console.log(`      Status: ${data?.status}`);
    console.log(`      Title: ${data?.title}`);
    console.log(`      Updated: ${data?.updatedAt?.toDate?.() || 'N/A'}`);
  } else {
    console.log('   ❌ Firestore: Phase document not found');
  }

  // Check Kairos endpoint availability
  const kairosBaseUrl = process.env.KAIROS_BASE_URL || process.env.KAIROS_EVENT_GATEWAY_URL;
  if (kairosBaseUrl) {
    console.log(`   ✅ Kairos: Endpoint configured (${kairosBaseUrl})`);
  } else {
    console.log('   ⚠️  Kairos: No endpoint configured (events may be disabled)');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting Phase P1: Foundation & Infra');
    console.log('='.repeat(60));
    console.log('');

    // Initialize Firebase
    const db = initializeFirebase();

    // Step 1: Update phase status in Firestore
    console.log('📋 Step 1: Update Firestore');
    const phaseDocId = await updatePhaseInFirestore(db, 'in_progress');
    console.log('');

    // Step 2: Emit Kairos events
    console.log('📋 Step 2: Emit Kairos Events');
    const eventResults = await emitKairosEvents(PHASE_P1.phaseId, 'in_progress');
    console.log('');

    // Step 3: Verify tracking
    await verifyTracking(db);
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('✅ Phase P1 Started Successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Phase: ${PHASE_P1.title} (${PHASE_P1.id})`);
    console.log(`   Status: in_progress`);
    console.log(`   Firestore: ✅ Updated`);
    console.log(`   Kairos Events: ${eventResults.updated ? '✅ Sent' : '⚠️  Failed'}`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Work on P1 tasks (UI/UX, Backend, Infra)');
    console.log('   2. Emit events as you complete tasks');
    console.log('   3. Check Kairos dashboard for progress tracking');
    console.log('   4. Update phase status to "completed" when all exit criteria are met');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
main();

export { main as startPhaseP1 };

