#!/usr/bin/env node

/**
 * Verify that ALL memories in the database are indexed (have embeddings)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { getFirestoreAdmin, getAuthAdmin } from '../src/lib/firebase-admin';

async function verifyAllMemoriesIndexed() {
  const testUserEmail = process.env.TEST_USER_EMAIL || 'joven.ong23@gmail.com';
  
  console.log('🔍 Verifying All Memories Are Indexed...\n');
  console.log(`User Email: ${testUserEmail}\n`);

  try {
    // Step 1: Get user ID
    const authAdmin = getAuthAdmin();
    const user = await authAdmin.getUserByEmail(testUserEmail);
    const userId = user.uid;
    console.log(`✅ User ID: ${userId}\n`);

    // Step 2: Get ALL memories (no limit)
    const firestoreAdmin = getFirestoreAdmin();
    const memoriesSnapshot = await firestoreAdmin
      .collection('memories')
      .where('userId', '==', userId)
      .get();
    
    console.log(`📊 Total memories found: ${memoriesSnapshot.size}\n`);
    
    if (memoriesSnapshot.size === 0) {
      console.log('ℹ️  No memories found for this user.');
      return;
    }
    
    // Step 3: Check each memory
    let hasEmbedding = 0;
    let missingEmbedding = 0;
    let invalidEmbedding = 0;
    const missingList: string[] = [];
    
    console.log('🔍 Checking each memory for embeddings...\n');
    
    for (const doc of memoriesSnapshot.docs) {
      const data = doc.data();
      const memoryId = doc.id;
      const content = data.content || '';
      const contentPreview = content.substring(0, 60).replace(/\n/g, ' ');
      
      // Check if embedding exists and is valid (1536 dimensions)
      const hasValidEmbedding = data.embedding && 
                                Array.isArray(data.embedding) && 
                                data.embedding.length === 1536 &&
                                data.embedding.some((v: any) => v !== 0);
      
      if (hasValidEmbedding) {
        hasEmbedding++;
      } else if (data.embedding && Array.isArray(data.embedding)) {
        invalidEmbedding++;
        missingList.push(`${memoryId}: Invalid embedding (${data.embedding.length} dims) - "${contentPreview}..."`);
      } else {
        missingEmbedding++;
        missingList.push(`${memoryId}: No embedding - "${contentPreview}..."`);
      }
    }
    
    // Step 4: Summary
    console.log('📊 Indexing Status Summary:\n');
    console.log(`  ✅ Memories with valid embeddings: ${hasEmbedding} (${((hasEmbedding / memoriesSnapshot.size) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Memories missing embeddings: ${missingEmbedding}`);
    console.log(`  ⚠️  Memories with invalid embeddings: ${invalidEmbedding}`);
    console.log(`  📦 Total memories: ${memoriesSnapshot.size}\n`);
    
    if (missingList.length > 0) {
      console.log('❌ Memories Missing Embeddings:\n');
      missingList.slice(0, 20).forEach((item, i) => {
        console.log(`  ${i + 1}. ${item}`);
      });
      if (missingList.length > 20) {
        console.log(`  ... and ${missingList.length - 20} more`);
      }
      console.log('\n⚠️  These memories need to be re-indexed!');
      console.log('   Run: npm run save-settings-memories (or use Re-index button in settings)\n');
    } else {
      console.log('✅✅✅ ALL MEMORIES ARE PROPERLY INDEXED! ✅✅✅\n');
      console.log('All memories have valid embeddings (1536 dimensions) and are ready for vector search.\n');
    }
    
    // Step 5: Check structure
    console.log('📋 Sample Memory Structure Check:\n');
    const sampleMemory = memoriesSnapshot.docs[0];
    const sampleData = sampleMemory.data();
    console.log(`  - id: ${sampleData.id ? '✅' : '❌'}`);
    console.log(`  - content: ${sampleData.content ? `✅ (${sampleData.content.length} chars)` : '❌'}`);
    console.log(`  - embedding: ${sampleData.embedding ? `✅ (${Array.isArray(sampleData.embedding) ? sampleData.embedding.length : 'not array'} dims)` : '❌'}`);
    console.log(`  - userId: ${sampleData.userId ? `✅ (${sampleData.userId})` : '❌'}`);
    console.log(`  - source: ${sampleData.source || 'not set'}`);
    console.log(`  - createdAt: ${sampleData.createdAt ? '✅' : '❌'}`);
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

verifyAllMemoriesIndexed();

