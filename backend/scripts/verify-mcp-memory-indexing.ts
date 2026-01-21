#!/usr/bin/env node

/**
 * Verification script to ensure MCP memories are being indexed correctly
 * 
 * This script:
 * 1. Tests the MCP add_memory handler
 * 2. Verifies the memory is saved to Firestore
 * 3. Checks that embedding is present
 * 4. Verifies the memory can be found via vector search
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { handleAddMemory } from '../src/mcp/tools/add-memory';
import { getFirestoreAdmin } from '../src/lib/firebase-admin';
import { searchMemories } from '../src/lib/vector';

async function verifyMCPMemoryIndexing() {
  console.log('🔍 Verifying MCP Memory Indexing...\n');

  // Test user email (update this to your test user)
  const testUserEmail = process.env.TEST_USER_EMAIL || 'joven.ong23@gmail.com';
  const testMemory = `MCP Test Memory - ${new Date().toISOString()}`;

  try {
    // Step 1: Create memory via MCP handler
    console.log('1️⃣  Creating memory via MCP add_memory handler...');
    const createResult = await handleAddMemory({
      memory: testMemory,
      user_email: testUserEmail,
    });

    if (!createResult.success || !createResult.memory_id) {
      console.error('❌ Failed to create memory:', createResult);
      process.exit(1);
    }

    console.log(`✅ Memory created: ${createResult.memory_id}\n`);

    // Step 2: Verify memory exists in Firestore
    console.log('2️⃣  Verifying memory in Firestore...');
    const firestoreAdmin = getFirestoreAdmin();
    const memoryDoc = await firestoreAdmin
      .collection('memories')
      .doc(createResult.memory_id)
      .get();

    if (!memoryDoc.exists) {
      console.error('❌ Memory document not found in Firestore!');
      process.exit(1);
    }

    const memoryData = memoryDoc.data();
    console.log('✅ Memory document found in Firestore');

    // Step 3: Verify required fields
    console.log('\n3️⃣  Verifying required fields...');
    const requiredFields = ['id', 'content', 'embedding', 'userId', 'createdAt', 'source'];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!(field in memoryData!)) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      console.error(`❌ Missing required fields: ${missingFields.join(', ')}`);
      process.exit(1);
    }

    console.log('✅ All required fields present');

    // Step 4: Verify embedding
    console.log('\n4️⃣  Verifying embedding...');
    const embedding = memoryData!.embedding;
    
    if (!Array.isArray(embedding)) {
      console.error('❌ Embedding is not an array!');
      process.exit(1);
    }

    if (embedding.length !== 1536) {
      console.error(`❌ Embedding has wrong dimension: ${embedding.length} (expected 1536)`);
      process.exit(1);
    }

    // Check embedding is not all zeros
    const hasNonZero = embedding.some((v: number) => v !== 0);
    if (!hasNonZero) {
      console.error('❌ Embedding is all zeros!');
      process.exit(1);
    }

    console.log(`✅ Embedding verified: ${embedding.length} dimensions, contains non-zero values`);

    // Step 5: Verify source field
    console.log('\n5️⃣  Verifying source field...');
    if (memoryData!.source !== 'mcp') {
      console.error(`❌ Source field is '${memoryData!.source}' (expected 'mcp')`);
      process.exit(1);
    }
    console.log('✅ Source field is correctly set to "mcp"');

    // Step 6: Test vector search
    console.log('\n6️⃣  Testing vector search...');
    const authAdmin = await import('../src/lib/firebase-admin').then(m => m.getAuthAdmin());
    const user = await authAdmin.getUserByEmail(testUserEmail);
    const userId = user.uid;

    // Search for the memory we just created
    const searchResults = await searchMemories(testMemory, userId, 10);
    
    const foundMemory = searchResults.find(r => r.id === createResult.memory_id);
    if (!foundMemory) {
      console.error('❌ Memory not found via vector search!');
      console.log('Search results:', searchResults.map(r => ({ id: r.id, score: r.score })));
      process.exit(1);
    }

    console.log(`✅ Memory found via vector search (score: ${foundMemory.score.toFixed(4)})`);

    // Step 7: Verify indexing by querying
    console.log('\n7️⃣  Verifying Firestore indexing...');
    const querySnapshot = await firestoreAdmin
      .collection('memories')
      .where('userId', '==', userId)
      .where('source', '==', 'mcp')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      console.error('❌ Memory not found via indexed query!');
      process.exit(1);
    }

    const queriedMemory = querySnapshot.docs[0];
    if (queriedMemory.id !== createResult.memory_id) {
      console.error('❌ Wrong memory returned from indexed query!');
      process.exit(1);
    }

    console.log('✅ Memory found via indexed Firestore query');

    // Cleanup: Delete test memory
    console.log('\n🧹 Cleaning up test memory...');
    await firestoreAdmin
      .collection('memories')
      .doc(createResult.memory_id)
      .delete();
    console.log('✅ Test memory deleted');

    console.log('\n✅✅✅ ALL VERIFICATIONS PASSED! ✅✅✅');
    console.log('\nSummary:');
    console.log('  ✅ MCP add_memory handler works correctly');
    console.log('  ✅ Memory saved to Firestore memories collection');
    console.log('  ✅ Embedding generated (1536 dimensions)');
    console.log('  ✅ Source field set to "mcp"');
    console.log('  ✅ Vector search works');
    console.log('  ✅ Firestore indexes work correctly');
    console.log('\n🎉 MCP memories are being indexed correctly!');

  } catch (error: any) {
    console.error('\n❌ Verification failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

verifyMCPMemoryIndexing();

