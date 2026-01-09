/**
 * Pandora Phase Seeder Script
 * This script seeds all 15 phases, syncs Firebase, and updates GitHub.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { Octokit } from '@octokit/rest';
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

// Phases Data
const phases = [
  { id: 1, title: "Core System Setup", description: "System initialization and base configuration.", status: "Completed", dependencies: [], build_entrypoint: "initialize_system" },
  { id: 2, title: "Autonomous Summarization & Insight Graph", description: "Integrating the graph database for contextual summaries.", status: "Deployed", dependencies: ["Phase 1"], build_entrypoint: "summarization_setup" },
  { id: 3, title: "Adaptive Context Layer", description: "Developing self-learning context layers for personalization.", status: "Active", dependencies: ["Phase 2"], build_entrypoint: "adaptive_context" },
  { id: 4, title: "Dynamic Knowledge Graph & Relational Awareness", description: "Integrating a knowledge graph for awareness.", status: "Integrated", dependencies: ["Phase 3"], build_entrypoint: "knowledge_graph_integration" },
  { id: 5, title: "Cognitive Context Fusion", description: "Fusing external and internal knowledge for real-time context.", status: "Live", dependencies: ["Phase 4"], build_entrypoint: "context_fusion" },
  { id: 6, title: "Self-Maintenance & Integrity Verification", description: "Ensuring data consistency, error detection, and repair.", status: "Defined", dependencies: ["Phase 5"], build_entrypoint: "self_maintenance" },
  { id: 7, title: "Self-Healing & Autonomous Recovery", description: "Automated recovery from faults and data integrity issues.", status: "Running", dependencies: ["Phase 6"], build_entrypoint: "self_healing" },
  { id: 8, title: "Predictive Evolution & Meta-Learning", description: "Enabling predictive learning capabilities for future-proofing.", status: "Deployed", dependencies: ["Phase 7"], build_entrypoint: "predictive_learning" },
  { id: 9, title: "Cross-System Intelligence Federation", description: "Federating intelligence across multiple systems.", status: "Implemented", dependencies: ["Phase 8"], build_entrypoint: "intelligence_federation" },
  { id: 10, title: "Conscious Orchestration Layer", description: "Integrating orchestrated decision-making between components.", status: "Built", dependencies: ["Phase 9"], build_entrypoint: "orchestration_layer" },
  { id: 11, title: "Ethical Governance & Constraint Framework", description: "Adding rules and governance layers to Pandora.", status: "Seeded", dependencies: ["Phase 10"], build_entrypoint: "ethical_governance" },
  { id: 12, title: "Reflection & Self-Diagnosis", description: "Enabling self-reflection and diagnosis of Pandora's health.", status: "Referenced", dependencies: ["Phase 11"], build_entrypoint: "self_reflection" },
  { id: 13, title: "Unified Cognition & Emergent Agency", description: "Creating a fully unified, emergent cognitive state.", status: "Stored", dependencies: ["Phase 12"], build_entrypoint: "unified_cognition" },
  { id: 14, title: "Distributed Conscious Subnetworks", description: "Allowing distributed agent networks to interact with Pandora.", status: "Stored", dependencies: ["Phase 13"], build_entrypoint: "distributed_subnetworks" },
      { id: 15, title: "Unified Gateway Layer", description: "Unified middleware integration for API gateway functionality.", status: "Active", dependencies: ["Phase 13", "Phase 14"], build_entrypoint: "gateway_integration" }
];

// Function to Seed Phases into Firestore
async function seedPhases(db: admin.firestore.Firestore) {
  console.log('🌱 Seeding phases into Firestore...');
  const batch = db.batch();
  
  for (const phase of phases) {
    const docRef = db.collection('system_phases').doc(`phase_${phase.id}`);
    batch.set(docRef, {
      id: phase.id,
      title: phase.title,
      description: phase.description,
      status: phase.status,
      dependencies: phase.dependencies,
      build_entrypoint: phase.build_entrypoint,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  await batch.commit();
  console.log(`✅ ${phases.length} phases seeded into Firestore.`);
}

// Function to Sync Build Sequences
async function syncBuildSequences(db: admin.firestore.Firestore) {
  console.log('🔄 Syncing build sequences...');
  const buildSequences = phases.map(phase => ({
    phase_id: phase.id,
    phase_title: phase.title,
    build_command: `@pandorasbox @firebase execute phase${phase.id} build sequence`,
    build_entrypoint: phase.build_entrypoint,
    dependencies: phase.dependencies
  }));

  const buildRef = db.collection('build_sequences').doc('sequences');
  await buildRef.set({
    sequences: buildSequences,
    total_phases: phases.length,
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('✅ Build sequences synced to Firestore.');
}

// Function to Update GitHub Actions with the Phases
async function updateGitHubActions() {
  const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  
  if (!githubToken) {
    console.warn('⚠️  GITHUB_TOKEN not found. Skipping GitHub Actions update.');
    return;
  }

  console.log('📝 Updating GitHub Actions workflows...');
  
  const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
  
  // Create .github/workflows directory if it doesn't exist
  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }

  const workflowFilePath = path.join(workflowsDir, 'phase-build.yml');
  
  // Create or update the workflow file
  const workflowContent = `name: Phase Build Sequences

on:
  workflow_dispatch:
    inputs:
      phase_id:
        description: 'Phase ID to build (1-15)'
        required: true
        type: choice
        options:
${phases.map(p => `          - '${p.id}'`).join('\n')}
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  build-phase:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build Phase
        env:
          FIREBASE_PROJECT_ID: \${{ secrets.FIREBASE_PROJECT_ID }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          echo "Building phase \${{ github.event.inputs.phase_id }}"
          # Add phase-specific build commands here
${phases.map(p => `          # Phase ${p.id}: ${p.title}`).join('\n')}
      
      - name: Deploy to Firebase
        if: success()
        run: firebase deploy --only firestore
`;

  fs.writeFileSync(workflowFilePath, workflowContent);
  console.log('✅ GitHub Action workflow created/updated.');

  // Optionally commit and push to GitHub
  try {
    const octokit = new Octokit({ auth: githubToken });
    const repo = process.env.GITHUB_REPOSITORY || 'besfeng23/Pandorasbox';
    const [owner, repoName] = repo.split('/');
    
    // Read the workflow file content
    const content = fs.readFileSync(workflowFilePath, 'utf-8');
    const encodedContent = Buffer.from(content).toString('base64');
    
    // Check if file exists
    try {
      const { data: existingFile } = await octokit.repos.getContent({
        owner,
        repo: repoName,
        path: '.github/workflows/phase-build.yml',
      });
      
      // Update existing file
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: '.github/workflows/phase-build.yml',
        message: 'Update phase build workflow',
        content: encodedContent,
        sha: (existingFile as any).sha,
      });
      console.log('✅ GitHub workflow file updated via API.');
    } catch (error: any) {
      if (error.status === 404) {
        // Create new file
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo: repoName,
          path: '.github/workflows/phase-build.yml',
          message: 'Add phase build workflow',
          content: encodedContent,
        });
        console.log('✅ GitHub workflow file created via API.');
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.warn(`⚠️  Could not update GitHub via API: ${error.message}`);
    console.log('💡 You can manually commit and push the workflow file.');
  }
}

// Main Execution
async function execute() {
  try {
    console.log('🧠 Pandora Phase Seeder\n');
    console.log('=' .repeat(60));

    // Initialize Firebase
    const db = initializeFirebase();

    // Seed phases
    await seedPhases(db);

    // Sync build sequences
    await syncBuildSequences(db);

    // Update GitHub Actions
    await updateGitHubActions();

    // Deploy to Firebase (optional - comment out if you want to deploy manually)
    console.log('\n🚀 Deploying to Firebase...');
    try {
      execSync('firebase deploy --only firestore', { stdio: 'inherit' });
      console.log('✅ Firebase deployment completed.');
    } catch (error: any) {
      console.warn(`⚠️  Firebase deployment failed: ${error.message}`);
      console.log('💡 You can deploy manually with: firebase deploy --only firestore');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ System setup and phase sync completed successfully!');
    console.log(`📊 Total phases seeded: ${phases.length}`);
    console.log('🎯 Next steps:');
    console.log('   1. Verify phases in Firebase Console');
    console.log('   2. Check GitHub Actions workflow');
    console.log('   3. Test phase build sequences');
    
  } catch (error: any) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }
}

// Start execution
execute();

