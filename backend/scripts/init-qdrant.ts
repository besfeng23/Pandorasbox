import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' }); // Try to load from parent or current

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = 'memories';
// BAAI/bge-small-en-v1.5 uses 384 dimensions
const VECTOR_SIZE = 384; 

async function main() {
  console.log(`Connecting to Qdrant at ${QDRANT_URL}...`);
  const client = new QdrantClient({ url: QDRANT_URL });

  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (exists) {
      console.log(`Collection '${COLLECTION_NAME}' already exists.`);
    } else {
      console.log(`Creating collection '${COLLECTION_NAME}' with size ${VECTOR_SIZE}...`);
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });
      console.log(`Collection '${COLLECTION_NAME}' created successfully.`);
    }
  } catch (error) {
    console.error('Error initializing Qdrant:', error);
    // process.exit(1); 
  }
}

main();

