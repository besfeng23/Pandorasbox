
import { getFirestoreAdmin } from '../src/lib/firebase-admin';

async function findCorruptedProfiles() {
    const db = getFirestoreAdmin();
    console.log('🔍 Scanning for users named "Pandora"...');

    // Check Profiles
    const snapshot = await db.collection('users').get();
    let found = 0;

    for (const doc of snapshot.docs) {
        const profileDoc = await db.doc(`users/${doc.id}/profile/data`).get();
        if (profileDoc.exists) {
            const data = profileDoc.data();
            if (data?.name?.toLowerCase().includes('pandora')) {
                console.log(`❌ CORRUPTION FOUND: User [${doc.id}] has name "${data.name}"`);
                console.log('   -> FIXING: Resetting name to null.');
                await db.doc(`users/${doc.id}/profile/data`).update({ name: null });
                found++;
            }
        }
    }

    if (found === 0) {
        console.log('✅ No profiles found with name "Pandora". The Database is clean.');
    } else {
        console.log(`⚠️ Fixed ${found} corrupted profiles.`);
    }
}

findCorruptedProfiles().catch(console.error);
