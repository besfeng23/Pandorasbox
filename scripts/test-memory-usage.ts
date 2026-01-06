#!/usr/bin/env node

/**
 * Test script to verify memories are being used in search
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { getFirestoreAdmin, getAuthAdmin } from '../src/lib/firebase-admin';
import { searchHistory, searchMemories } from '../src/lib/vector';

async function testMemoryUsage() {
  const testUserEmail = process.env.TEST_USER_EMAIL || 'joven.ong23@gmail.com';
  const testQuery = 'Joven POV collapse scene';
  
  console.log('🔍 Testing Memory Usage in Search...\n');
  console.log(`User Email: ${testUserEmail}`);
  console.log(`Query: ${testQuery}\n`);

  try {
    // Step 1: Get user ID
    const authAdmin = getAuthAdmin();
    const user = await authAdmin.getUserByEmail(testUserEmail);
    const userId = user.uid;
    console.log(`✅ User ID: ${userId}\n`);

    // Step 2: Test history search
    console.log('📚 Testing History Search...');
    try {
      const historyResults = await searchHistory(testQuery, userId);
      console.log(`  ✅ History search returned ${historyResults.length} results`);
      if (historyResults.length > 0) {
        console.log(`  Top result: "${historyResults[0].text.substring(0, 60)}..." (score: ${historyResults[0].score.toFixed(3)})`);
      }
    } catch (error: any) {
      console.error(`  ❌ History search failed:`, error.message);
    }

    // Step 3: Test memories search
    console.log('\n💾 Testing Memories Search...');
    try {
      const memoryResults = await searchMemories(testQuery, userId, 10);
      console.log(`  ✅ Memories search returned ${memoryResults.length} results`);
      if (memoryResults.length > 0) {
        console.log(`  Top result: "${memoryResults[0].text.substring(0, 60)}..." (score: ${memoryResults[0].score.toFixed(3)})`);
        console.log(`\n  All memory results:`);
        memoryResults.forEach((r, i) => {
          console.log(`    ${i + 1}. [${r.score.toFixed(3)}] ${r.text.substring(0, 80)}...`);
        });
      } else {
        console.log(`  ⚠️  No memory results found - this might be why memories aren't being used!`);
      }
    } catch (error: any) {
      console.error(`  ❌ Memories search failed:`, error.message);
      console.error(`  Error details:`, {
        code: error.code,
        stack: error.stack?.substring(0, 300)
      });
    }

    // Step 4: Test combined search (like searchMemoryAction)
    console.log('\n🔗 Testing Combined Search (History + Memories)...');
    try {
      const [historyResults, memoryResults] = await Promise.all([
        searchHistory(testQuery, userId).catch(() => []),
        searchMemories(testQuery, userId, 10).catch(() => [])
      ]);

      const allResults = [
        ...historyResults.map(r => ({ ...r, source: 'history' as const })),
        ...memoryResults.map(r => ({ ...r, source: 'memory' as const }))
      ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

      console.log(`  ✅ Combined search returned ${allResults.length} results`);
      console.log(`  Breakdown: ${historyResults.length} from history, ${memoryResults.length} from memories`);
      
      if (allResults.length > 0) {
        console.log(`\n  Top 5 combined results:`);
        allResults.slice(0, 5).forEach((r, i) => {
          console.log(`    ${i + 1}. [${r.source}] [${r.score.toFixed(3)}] ${r.text.substring(0, 70)}...`);
        });
      } else {
        console.log(`  ⚠️  No results found at all!`);
      }
    } catch (error: any) {
      console.error(`  ❌ Combined search failed:`, error.message);
    }

    // Step 5: Check memory count
    console.log('\n📊 Checking Memory Count...');
    const firestoreAdmin = getFirestoreAdmin();
    const memoryCount = await firestoreAdmin
      .collection('memories')
      .where('userId', '==', userId)
      .count()
      .get();
    
    console.log(`  Total memories in database: ${memoryCount.data().count}`);
    
    if (memoryCount.data().count === 0) {
      console.log(`  ⚠️  WARNING: No memories found! This is why memories aren't being used.`);
    }

    console.log('\n✅✅✅ MEMORY USAGE TEST COMPLETE ✅✅✅\n');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testMemoryUsage();

