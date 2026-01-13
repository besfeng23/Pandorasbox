import { Firestore } from '@google-cloud/firestore';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'seismic-vista-480710-q5';
const userEmail = 'joven.ong23@gmail.com';

async function findUserId() {
  try {
    const firestore = new Firestore({ projectId: PROJECT_ID });
    
    console.log(`🔍 Looking for user ID for: ${userEmail}`);
    console.log('');
    
    // Try to find in memories with metadata.userEmail
    console.log('1. Checking memories collection for metadata.userEmail...');
    const memoriesWithEmail = await firestore
      .collection('memories')
      .where('metadata.userEmail', '==', userEmail)
      .limit(10)
      .get();
    
    if (!memoriesWithEmail.empty) {
      console.log(`   Found ${memoriesWithEmail.size} memories with this email:`);
      const userIds = new Set<string>();
      memoriesWithEmail.forEach(doc => {
        const memory = doc.data();
        if (memory.userId) {
          userIds.add(memory.userId);
          console.log(`   - Memory ID: ${doc.id}, User ID: ${memory.userId}`);
        }
      });
      if (userIds.size === 1) {
        const userId = Array.from(userIds)[0];
        console.log(`   ✅ Unique user ID found: ${userId}`);
        return userId;
      } else if (userIds.size > 1) {
        console.log(`   ⚠️  Multiple user IDs found: ${Array.from(userIds).join(', ')}`);
      }
    }
    
    // Also check all memories to see if any have this email
    console.log('1b. Checking all memories for this email in any field...');
    const allMemories = await firestore.collection('memories').limit(500).get();
    const foundUserIds = new Set<string>();
    allMemories.forEach(doc => {
      const data = doc.data();
      const dataStr = JSON.stringify(data).toLowerCase();
      if (dataStr.includes(userEmail.toLowerCase())) {
        if (data.userId) {
          foundUserIds.add(data.userId);
          console.log(`   - Found in memory ${doc.id}: User ID ${data.userId}`);
        }
      }
    });
    if (foundUserIds.size === 1) {
      const userId = Array.from(foundUserIds)[0];
      console.log(`   ✅ Unique user ID from all memories: ${userId}`);
      return userId;
    }
    
    // Try to find in settings collection (doc ID is userId)
    console.log('2. Checking settings collection...');
    const settingsSnapshot = await firestore.collection('settings').limit(100).get();
    for (const doc of settingsSnapshot.docs) {
      const settings = doc.data();
      if (settings.email === userEmail) {
        console.log(`   ✅ Found in settings: ${doc.id}`);
        return doc.id;
      }
    }
    
    // Try to find in threads
    console.log('3. Checking threads collection...');
    const threadsSnapshot = await firestore.collection('threads').limit(100).get();
    for (const doc of threadsSnapshot.docs) {
      const thread = doc.data();
      if (thread.userEmail === userEmail || thread.email === userEmail) {
        console.log(`   ✅ Found in threads: ${thread.userId}`);
        return thread.userId;
      }
    }
    
    // List all unique userIds from memories to help identify
    console.log('4. Listing all unique user IDs from memories...');
    const allMemoriesForListing = await firestore.collection('memories').limit(200).get();
    const userIdsForListing = new Set<string>();
    allMemoriesForListing.forEach(doc => {
      const data = doc.data();
      if (data.userId) {
        userIdsForListing.add(data.userId);
      }
    });
    
    console.log(`   Found ${userIdsForListing.size} unique user IDs:`);
    userIdsForListing.forEach(id => console.log(`   - ${id}`));
    
    console.log('');
    console.log('❌ Could not find user ID for this email in Firestore.');
    console.log('   Please check Firebase Auth console or provide the correct user ID.');
    
    return null;
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

findUserId().then(userId => {
  if (userId) {
    console.log('');
    console.log(`✅ Correct User ID: ${userId}`);
    process.exit(0);
  } else {
    process.exit(1);
  }
});

