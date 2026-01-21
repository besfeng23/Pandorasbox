#!/usr/bin/env node

/**
 * Debug script to check why memories aren't appearing in search results
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { getFirestoreAdmin, getAuthAdmin } from '../src/lib/firebase-admin';
import { searchMemories } from '../src/lib/vector';

async function debugMemorySearch() {
  const testUserEmail = process.env.TEST_USER_EMAIL || 'joven.ong23@gmail.com';
  const testQuery = 'Joven POV collapse scene';
  
  console.log('🔍 Debugging Memory Search...\n');
  console.log(`User Email: ${testUserEmail}`);
  console.log(`Query: ${testQuery}\n`);

  try {
    // Step 1: Get user ID
    const authAdmin = getAuthAdmin();
    const user = await authAdmin.getUserByEmail(testUserEmail);
    const userId = user.uid;
    console.log(`✅ User ID: ${userId}\n`);

    // Step 2: Check if memories exist
    const firestoreAdmin = getFirestoreAdmin();
    const memoriesSnapshot = await firestoreAdmin
      .collection('memories')
      .where('userId', '==', userId)
      .limit(10)
      .get();
    
    console.log(`📊 Total memories for user: ${memoriesSnapshot.size}`);
    
    if (memoriesSnapshot.size === 0) {
      console.log('❌ No memories found for this user!');
      return;
    }
    
    // Step 3: Check memory structure
    console.log('\n📋 Checking memory structure...');
    const sampleMemory = memoriesSnapshot.docs[0];
    const memoryData = sampleMemory.data();
    
    console.log('Sample memory fields:');
    console.log(`  - id: ${memoryData.id ? '✅' : '❌'}`);
    console.log(`  - content: ${memoryData.content ? `✅ (${memoryData.content.length} chars)` : '❌'}`);
    console.log(`  - embedding: ${memoryData.embedding ? `✅ (${Array.isArray(memoryData.embedding) ? memoryData.embedding.length : 'not array'} dims)` : '❌'}`);
    console.log(`  - userId: ${memoryData.userId ? `✅ (${memoryData.userId})` : '❌'}`);
    console.log(`  - source: ${memoryData.source || 'not set'}`);
    console.log(`  - createdAt: ${memoryData.createdAt ? '✅' : '❌'}`);
    
    // Step 4: Check embedding validity
    if (memoryData.embedding) {
      const embedding = memoryData.embedding;
      if (Array.isArray(embedding)) {
        console.log(`\n🔢 Embedding details:`);
        console.log(`  - Dimensions: ${embedding.length}`);
        console.log(`  - Expected: 1536`);
        console.log(`  - Valid: ${embedding.length === 1536 ? '✅' : '❌'}`);
        const hasNonZero = embedding.some((v: number) => v !== 0);
        console.log(`  - Has non-zero values: ${hasNonZero ? '✅' : '❌'}`);
        const allZero = embedding.every((v: number) => v === 0);
        console.log(`  - All zeros: ${allZero ? '❌ WARNING!' : '✅'}`);
      } else {
        console.log('❌ Embedding is not an array!');
      }
    } else {
      console.log('❌ No embedding field found!');
    }
    
    // Step 5: Try vector search
    console.log('\n🔍 Testing vector search...');
    try {
      const searchResults = await searchMemories(testQuery, userId, 10);
      console.log(`✅ Vector search returned ${searchResults.length} results`);
      
      if (searchResults.length > 0) {
        console.log('\n📝 Search results:');
        searchResults.forEach((result, i) => {
          console.log(`  ${i + 1}. Score: ${result.score.toFixed(4)}, ID: ${result.id}`);
          console.log(`     Content: ${result.text.substring(0, 100)}...`);
        });
      } else {
        console.log('⚠️  Vector search returned 0 results');
        console.log('   This could mean:');
        console.log('   1. Vector index not deployed/active');
        console.log('   2. Embeddings not matching query');
        console.log('   3. Index still building');
      }
    } catch (searchError: any) {
      console.error('❌ Vector search failed:', searchError.message);
      console.error('   Error code:', searchError.code);
      console.error('   This likely means vector indexes are not deployed');
    }
    
    // Step 6: Check Firestore indexes
    console.log('\n📊 Checking Firestore indexes...');
    console.log('   Note: Index status must be checked in Firebase Console');
    console.log('   Go to: Firebase Console → Firestore → Indexes');
    console.log('   Look for indexes on "memories" collection with "embedding" field');
    
    // Step 7: List recent memories
    console.log('\n📚 Recent memories (last 5):');
    const recentMemories = await firestoreAdmin
      .collection('memories')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    recentMemories.docs.forEach((doc, i) => {
      const data = doc.data();
      console.log(`  ${i + 1}. [${data.source || 'unknown'}] ${data.content?.substring(0, 60)}...`);
      console.log(`     ID: ${doc.id}, Has embedding: ${data.embedding ? '✅' : '❌'}`);
    });
    
  } catch (error: any) {
    console.error('\n❌ Debug failed:', error);
    console.error('Stack:', error.stack);
  }
}

debugMemorySearch();

