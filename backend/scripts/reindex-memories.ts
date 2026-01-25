/**
 * Script to re-index existing memories that are missing embeddings
 * This ensures all memories in the memories collection have embeddings for vector search
 * 
 * Run with: npx tsx scripts/reindex-memories.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { generateEmbedding } from '../src/lib/vector';
import serviceAccount from '../service-account.json';

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount as any),
  });
}

const firestore = getFirestore();

async function reindexMemories() {
  console.log('🔍 Fetching all memories...');
  
  const memoriesRef = firestore.collection('memories');
  const snapshot = await memoriesRef.limit(1000).get();
  
  console.log(`📊 Found ${snapshot.size} memories`);
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const memoryId = doc.id;
    
    // Check if embedding exists and is valid
    const hasEmbedding = data.embedding && Array.isArray(data.embedding) && data.embedding.length === 1536;
    
    if (hasEmbedding) {
      console.log(`⏭️  Memory ${memoryId} already has embedding, skipping...`);
      skipped++;
      continue;
    }
    
    try {
      console.log(`🔄 Processing memory ${memoryId}: "${data.content?.substring(0, 50)}..."`);
      
      if (!data.content) {
        console.log(`⚠️  Memory ${memoryId} has no content, skipping...`);
        skipped++;
        continue;
      }
      
      // Generate embedding
      const embedding = await generateEmbedding(data.content);
      
      // Update document with embedding
      await doc.ref.update({
        embedding: embedding,
        reindexedAt: new Date(),
      });
      
      console.log(`✅ Re-indexed memory ${memoryId}`);
      processed++;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error re-indexing memory ${memoryId}:`, error);
      errors++;
    }
  }
  
  console.log('\n📈 Summary:');
  console.log(`  ✅ Processed: ${processed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`  📊 Total: ${snapshot.size}`);
}

// Run the script
reindexMemories()
  .then(() => {
    console.log('\n✨ Re-indexing complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

