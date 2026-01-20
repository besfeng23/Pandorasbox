import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin (Standalone script needs its own init)
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) 
  : require('../../../firebase-service-account.json'); // Fallback to file if env var missing

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = getFirestore();

async function exportDataset() {
  console.log('Exporting training dataset from Firestore...');
  const snapshot = await db.collection('training_pairs')
    .where('rating', '==', 'good') // Only learn from good examples or corrected ones
    .get();

  const dataset: any[] = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    
    // Alpaca Format
    const entry = {
        instruction: data.prompt || "User query",
        input: "", // Optional context if needed
        output: data.correction || data.response // Prefer correction if available
    };

    if (entry.instruction && entry.output) {
        dataset.push(entry);
    }
  });

  const outputPath = path.join(__dirname, 'data', 'dataset.jsonl');
  const outputDir = path.dirname(outputPath);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const stream = fs.createWriteStream(outputPath);
  dataset.forEach(item => {
      stream.write(JSON.stringify(item) + '\n');
  });
  stream.end();

  console.log(`Exported ${dataset.length} training examples to ${outputPath}`);
}

exportDataset().catch(console.error);


