import { Firestore } from '@google-cloud/firestore';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'seismic-vista-480710-q5';
const memoryId = 'a1JeOlpJW5A29Mq4cni3';

async function deleteMemory() {
  try {
    const firestore = new Firestore({ projectId: PROJECT_ID });
    
    console.log(`🗑️  Deleting memory: ${memoryId}`);
    await firestore.collection('memories').doc(memoryId).delete();
    console.log(`✅ Memory deleted successfully`);
  } catch (error: any) {
    console.error(`❌ Error deleting memory: ${error.message}`);
    process.exit(1);
  }
}

deleteMemory();

