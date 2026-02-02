import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

// Map naming discrepancy between .env.local and code
if (process.env.FIREBASE_ADMIN_CREDENTIALS && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = process.env.FIREBASE_ADMIN_CREDENTIALS;
}
if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && !process.env.FIREBASE_PROJECT_ID) {
    process.env.FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

import { getMemoryJanitor } from '../src/lib/hybrid/memory-janitor';
import { getFirestoreAdmin } from '../src/lib/firebase-admin';

async function runManualJanitor() {
    console.log('--- Manual Memory Janitor Execution ---');

    try {
        const db = getFirestoreAdmin();
        const janitor = getMemoryJanitor();

        // List all collections to see what we have
        const collections = await db.listCollections();
        console.log('📚 Available Collections:', collections.map(c => c.id).join(', '));

        // Find the most recently active user
        const usersSnapshot = await db.collection('users')
            .get();

        console.log(`📊 Total docs in 'users' collection: ${usersSnapshot.size}`);

        if (usersSnapshot.empty) {
            console.error('❌ No users found in Firestore.');
            return;
        }

        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        console.log(`👤 Targeting User: ${userData.email || userId} (${userId})`);
        console.log('⏳ Running crystallization for agent: universe...');

        const result = await janitor.run(userId, 'universe');

        console.log('\n✅ Janitor Task Completed Successfully!');
        console.log('Summary:');
        console.log(`- Processed Memories: ${result.processedMemories}`);
        console.log(`- Created Facts: ${result.createdFacts}`);
        console.log(`- Deleted Memories: ${result.deletedMemories}`);
        console.log(`- Errors: ${result.errors.length}`);

        if (result.errors.length > 0) {
            console.log('\nTop Errors:');
            result.errors.slice(0, 3).forEach((err: any, i: number) => {
                console.log(`${i + 1}. ${err}`);
            });
        }

    } catch (error: any) {
        console.error('❌ Fatal Error during Janitor execution:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

runManualJanitor().catch(console.error);
