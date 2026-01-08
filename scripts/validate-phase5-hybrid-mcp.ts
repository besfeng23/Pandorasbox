/**
 * Phase 5 Validation Script: External Knowledge Fusion (MCP Version)
 * 
 * Uses Firebase MCP tools to validate hybrid search functionality
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { hybridSearch } from '../src/lib/hybrid-search';
import { getFirestoreAdmin, getAuthAdmin } from '../src/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function getUserUidFromEmail(email: string): Promise<string> {
  const authAdmin = getAuthAdmin();
  try {
    const user = await authAdmin.getUserByEmail(email);
    return user.uid;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      const newUser = await authAdmin.createUser({
        email,
        emailVerified: false,
        disabled: false,
      });
      console.log(`✅ Created test user: ${email} (UID: ${newUser.uid})`);
      return newUser.uid;
    }
    throw error;
  }
}

async function logToSystemLogs(
  tag: string,
  data: Record<string, any>
): Promise<void> {
  const firestoreAdmin = getFirestoreAdmin();
  const logsCollection = firestoreAdmin.collection('system_logs');

  const logEntry = {
    tag,
    data,
    timestamp: FieldValue.serverTimestamp(),
    phase: 'phase5',
    validation: true,
  };

  await logsCollection.add(logEntry);
  console.log(`✅ Logged to system_logs with tag: ${tag}`);
}

async function main() {
  const query = 'latest AI security updates';
  const testEmail = 'chatgpt@pandorasbox.com';

  console.log('🔍 Phase 5 Validation: External Knowledge Fusion\n');
  console.log(`Query: "${query}"`);
  console.log(`User Email: ${testEmail}\n`);

  try {
    // Get user UID
    console.log('📧 Getting user UID...');
    const userId = await getUserUidFromEmail(testEmail);
    console.log(`✅ User UID: ${userId}\n`);

    // Run hybrid search
    console.log('🔎 Running hybrid search...');
    const startTime = Date.now();
    const results = await hybridSearch(query, userId, 10);
    const duration = Date.now() - startTime;

    console.log(`✅ Hybrid search completed in ${duration}ms\n`);

    // Analyze results
    const internalResults = results.filter(r => r.source === 'internal');
    const externalResults = results.filter(r => r.source === 'external');
    const internalCount = internalResults.length;
    const externalCount = externalResults.length;

    // Calculate average confidence
    const avgConfidence =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        : 0;

    // Calculate average fused score
    const avgFusedScore =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.fusedScore, 0) / results.length
        : 0;

    // Print results
    console.log('📊 Results Summary:');
    console.log(`   Total Results: ${results.length}`);
    console.log(`   Internal Results: ${internalCount}`);
    console.log(`   External Results: ${externalCount}`);
    console.log(`   Average Confidence: ${avgConfidence.toFixed(3)}`);
    console.log(`   Average Fused Score: ${avgFusedScore.toFixed(3)}`);
    console.log(`   Search Duration: ${duration}ms\n`);

    // Print top results
    console.log('🏆 Top 5 Results (by fused score):');
    results.slice(0, 5).forEach((result, index) => {
      console.log(
        `   ${index + 1}. [${result.source.toUpperCase()}] Score: ${result.fusedScore.toFixed(3)}, Confidence: ${result.confidence.toFixed(3)}`
      );
      console.log(`      Content: ${result.content.substring(0, 100)}...`);
      if (result.url) {
        console.log(`      URL: ${result.url}`);
      }
      console.log('');
    });

    // Validation checks
    console.log('✅ Validation Checks:');
    const checks = {
      hasResults: results.length > 0,
      hasInternal: internalCount > 0,
      hasExternal: externalCount > 0,
      hasFusedScores: results.every(r => r.fusedScore > 0),
      avgConfidenceValid: avgConfidence > 0,
    };

    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}: ${passed}`);
    });

    const allPassed = Object.values(checks).every(v => v);
    console.log(`\n${allPassed ? '✅' : '❌'} Overall: ${allPassed ? 'PASS' : 'FAIL'}\n`);

    // Log to Firestore
    console.log('📝 Logging to Firestore system_logs...');
    await logToSystemLogs('phase5-hybrid-fusion', {
      query,
      userId,
      userEmail: testEmail,
      resultsCount: results.length,
      internalCount,
      externalCount,
      avgConfidence,
      avgFusedScore,
      duration,
      topResults: results.slice(0, 3).map(r => ({
        source: r.source,
        fusedScore: r.fusedScore,
        confidence: r.confidence,
        hasUrl: !!r.url,
      })),
      validationPassed: allPassed,
      timestamp: new Date().toISOString(),
    });

    // Verify external_knowledge cache
    console.log('\n🔍 Verifying external_knowledge cache...');
    const firestoreAdmin = getFirestoreAdmin();
    const cacheSnapshot = await firestoreAdmin
      .collection('external_knowledge')
      .where('query', '==', query.toLowerCase())
      .limit(5)
      .get();

    console.log(`   Found ${cacheSnapshot.size} cached entries for query`);
    if (cacheSnapshot.size > 0) {
      console.log('   ✅ Cache verification: PASS');
    } else if (externalCount > 0) {
      console.log('   ⚠️  Cache not yet populated (will be created on next run)');
    }

    console.log('\n✅ Phase 5 Validation Complete!');
    process.exit(allPassed ? 0 : 1);
  } catch (error: any) {
    console.error('❌ Validation failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();

