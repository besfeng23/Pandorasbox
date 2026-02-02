import { config } from 'dotenv';
import { resolve } from 'path';
import { createHash } from 'crypto';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Override for tunnel
process.env.QDRANT_URL = 'http://localhost:6333';
process.env.INFERENCE_URL = 'http://localhost:11434';
process.env.UNIVERSE_INFERENCE_URL = 'http://localhost:11434';

import { getFirestoreAdmin } from '../src/lib/firebase-admin';
import { indexMemoriesBatch } from '../src/lib/vector-store';

function toUUID(str: string): string {
    const hash = createHash('md5').update(str).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

async function syncFirestoreToQdrant() {
    console.log('🚀 Starting Firestore to Qdrant Sync with deterministic IDs...');

    try {
        const db = getFirestoreAdmin();
        console.log('📦 Fetching memories from Firestore...');
        const snapshot = await db.collection('memories').get();
        console.log(`📊 Found ${snapshot.size} memories in Firestore`);

        if (snapshot.empty) {
            console.log('ℹ️ No memories to sync.');
            return;
        }

        const memories = snapshot.docs.map(doc => {
            const data = doc.data();

            // Default to universe agent if not specified
            const agentId = (data.agentId || 'universe') as any;

            return {
                id: toUUID(doc.id),
                content: data.content || '',
                uid: data.userId || 'unknown',
                agentId: agentId,
                type: data.type || 'memory',
                metadata: {
                    ...data.metadata,
                    firestoreId: doc.id,
                    syncedAt: new Date().toISOString()
                }
            };
        }).filter(m => m.content.length > 0);

        console.log(`🔄 Syncing ${memories.length} valid memories to Qdrant in batches...`);

        // Process in one go or batches - indexMemoriesBatch handles agent grouping
        const result = await indexMemoriesBatch(memories);

        console.log(`✅ Successfully synced ${result.length} memories to Qdrant.`);

    } catch (error: any) {
        console.error('❌ Sync failed:', error);
    }
}

syncFirestoreToQdrant()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
