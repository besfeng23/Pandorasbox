import { fetch } from 'undici';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const EMBEDDINGS_URL = process.env.EMBEDDINGS_BASE_URL || 'http://localhost:8080';

async function waitForService(url, name, maxRetries = 30) {
  console.log(`Waiting for ${name} at ${url}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`✅ ${name} is ready!`);
        return true;
      }
    } catch (e) {
      // ignore
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.error(`❌ ${name} failed to start after ${maxRetries}s`);
  return false;
}

async function main() {
  const qdrantReady = await waitForService(`${QDRANT_URL}/collections`, 'Qdrant');
  const embeddingsReady = await waitForService(`${EMBEDDINGS_URL}/health`, 'Embeddings Service');
  
  if (!qdrantReady || !embeddingsReady) {
    process.exit(1);
  }
}

main();

