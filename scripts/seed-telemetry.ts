/**
 * Pandora Telemetry Seeder Script
 * This script seeds initial telemetry data for system_federation, system_selfheal, and system_governance.
 */

import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { config } from 'dotenv';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  // Priority 1: Service account from environment variable (for GitHub Actions)
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      console.log('Initializing Firebase Admin with FIREBASE_SERVICE_ACCOUNT_KEY...');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      return admin.firestore();
    } catch (error: any) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error.message);
    }
  }

  // Priority 2: Local service account file
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      console.log('Initializing Firebase Admin with service-account.json...');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      return admin.firestore();
    } catch (error: any) {
      console.warn('Failed to load service-account.json:', error.message);
    }
  }

  // Priority 3: Application Default Credentials (with proper database URL)
  try {
    console.log('Initializing Firebase Admin with Application Default Credentials...');
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      ...(projectId && { projectId }),
    });
    return admin.firestore();
  } catch (error: any) {
    throw new Error(`Failed to initialize Firebase Admin: ${error.message}. Please set FIREBASE_SERVICE_ACCOUNT_KEY secret in GitHub Actions.`);
  }
}

async function seedTelemetry(db: admin.firestore.Firestore) {
  console.log('🌱 Seeding telemetry data...');
  const batch = db.batch();

  // 1. System Federation (Phase 9)
  const federationRef = db.collection('system_federation').doc('current');
  batch.set(federationRef, {
    phase: 9,
    connected_systems: 12,
    active_federations: ["system-a", "system-b", "system-c"],
    syncLatency: 84,
    healthScore: 0.93,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  // 2. System Self-Healing (Phase 7)
  const selfHealRef = db.collection('system_selfheal').doc('latest_check');
  batch.set(selfHealRef, {
    phase: 7,
    last_recovery: new Date().toISOString(),
    recovery_events: 3,
    health_status: "healthy",
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  // 3. System Governance (Phase 11)
  const governanceRef = db.collection('system_governance').doc('current');
  batch.set(governanceRef, {
    phase: 11,
    constraintStatus: "stable",
    active_constraints: 5,
    violations_today: 0,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  await batch.commit();
  console.log('✅ Telemetry data seeded successfully.');
}

async function execute() {
  try {
    console.log('📊 Pandora Telemetry Seeder\n');
    console.log('=' .repeat(60));

    const db = initializeFirebase();
    await seedTelemetry(db);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Telemetry seeding completed!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

execute();

