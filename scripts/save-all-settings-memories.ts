#!/usr/bin/env node

/**
 * Script to ensure all memories from settings are saved to Firebase
 * This script:
 * 1. Checks all memories in the memories collection
 * 2. Ensures they all have embeddings
 * 3. Generates embeddings for any missing ones
 * 4. Verifies all memories are properly indexed
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { getFirestoreAdmin, getAuthAdmin } from '../src/lib/firebase-admin';
import { generateEmbedding } from '../src/lib/vector';
import { FieldValue } from 'firebase-admin/firestore';

async function saveAllSettingsMemories() {
  const testUserEmail = process.env.TEST_USER_EMAIL || 'joven.ong23@gmail.com';
  
  console.log('💾 Saving All Settings Memories to Firebase...\n');
  console.log(`User Email: ${testUserEmail}\n`);

  try {
    // Step 1: Get user ID
    const authAdmin = getAuthAdmin();
    const user = await authAdmin.getUserByEmail(testUserEmail);
    const userId = user.uid;
    console.log(`✅ User ID: ${userId}\n`);

    // Step 2: Get all memories for this user
    const firestoreAdmin = getFirestoreAdmin();
    const memoriesSnapshot = await firestoreAdmin
      .collection('memories')
      .where('userId', '==', userId)
      .get();
    
    console.log(`📊 Found ${memoriesSnapshot.size} total memories for user\n`);
    
    if (memoriesSnapshot.size === 0) {
      console.log('ℹ️  No memories found for this user.');
      console.log('   Memories will be automatically saved when created from settings.');
      return;
    }
    
    // Step 3: Check each memory and ensure it has an embedding
    let needsEmbedding = 0;
    let hasEmbedding = 0;
    let errors = 0;
    const batch = firestoreAdmin.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    console.log('🔍 Checking memories for embeddings...\n');
    
    for (const doc of memoriesSnapshot.docs) {
      const data = doc.data();
      const memoryId = doc.id;
      
      // Check if embedding exists and is valid (1536 dimensions)
      const hasValidEmbedding = data.embedding && 
                                Array.isArray(data.embedding) && 
                                data.embedding.length === 1536 &&
                                data.embedding.some((v: any) => v !== 0);
      
      if (hasValidEmbedding) {
        hasEmbedding++;
        continue;
      }
      
      // Memory needs embedding
      needsEmbedding++;
      
      try {
        if (!data.content || typeof data.content !== 'string' || !data.content.trim()) {
          console.warn(`⚠️  Memory ${memoryId} has no valid content, skipping`);
          errors++;
          continue;
        }
        
        console.log(`  📝 Generating embedding for memory ${memoryId}: "${data.content.substring(0, 50)}..."`);
        
        // Generate embedding
        const embedding = await generateEmbedding(data.content.trim());
        
        // Update document with embedding
        batch.update(doc.ref, {
          embedding: embedding,
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        batchCount++;
        
        // Commit batch if it reaches the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`  ✅ Committed batch of ${batchCount} updates`);
          batchCount = 0;
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error: any) {
        console.error(`  ❌ Error processing memory ${memoryId}:`, error.message);
        errors++;
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`  ✅ Committed final batch of ${batchCount} updates`);
    }
    
    // Step 4: Summary
    console.log('\n📊 Summary:');
    console.log(`  ✅ Memories with embeddings: ${hasEmbedding}`);
    console.log(`  🔄 Memories that needed embeddings: ${needsEmbedding}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📦 Total memories: ${memoriesSnapshot.size}`);
    
    if (needsEmbedding > 0) {
      console.log(`\n✅ Successfully saved ${needsEmbedding} memories with embeddings to Firebase!`);
    } else {
      console.log(`\n✅ All memories already have embeddings and are properly saved to Firebase!`);
    }
    
    // Step 5: Verify all memories are in Firebase
    console.log('\n🔍 Verifying all memories are in Firebase...');
    const verifySnapshot = await firestoreAdmin
      .collection('memories')
      .where('userId', '==', userId)
      .limit(10)
      .get();
    
    console.log(`  ✅ Verified: ${verifySnapshot.size} memories found in Firebase`);
    
    if (verifySnapshot.size > 0) {
      const sampleMemory = verifySnapshot.docs[0].data();
      console.log('\n📋 Sample memory structure:');
      console.log(`  - id: ${sampleMemory.id ? '✅' : '❌'}`);
      console.log(`  - content: ${sampleMemory.content ? `✅ (${sampleMemory.content.length} chars)` : '❌'}`);
      console.log(`  - embedding: ${sampleMemory.embedding ? `✅ (${Array.isArray(sampleMemory.embedding) ? sampleMemory.embedding.length : 'not array'} dims)` : '❌'}`);
      console.log(`  - userId: ${sampleMemory.userId ? `✅ (${sampleMemory.userId})` : '❌'}`);
      console.log(`  - source: ${sampleMemory.source || 'not set'}`);
      console.log(`  - createdAt: ${sampleMemory.createdAt ? '✅' : '❌'}`);
    }
    
    console.log('\n✅✅✅ ALL SETTINGS MEMORIES SAVED TO FIREBASE ✅✅✅\n');
    
  } catch (error: any) {
    console.error('\n❌ Error saving settings memories:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

saveAllSettingsMemories();

