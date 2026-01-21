import { fetch } from 'undici';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const EMBEDDINGS_URL = process.env.EMBEDDINGS_BASE_URL || 'http://localhost:8080';

async function smokeTest() {
  console.log('🚬 Running smoke test...');
  
  // Test Embeddings
  try {
    const embedRes = await fetch(`${EMBEDDINGS_URL}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: "Hello world" })
    });
    
    if (!embedRes.ok) throw new Error(`Embeddings failed: ${embedRes.statusText}`);
    const embedJson = await embedRes.json();
    if (!embedJson.data?.[0]?.embedding) throw new Error('Invalid embedding response');
    console.log('✅ Embeddings service working');
  } catch (e) {
    console.error('❌ Embeddings test failed:', e.message);
    process.exit(1);
  }

  // Test Qdrant
  try {
    const qdrantRes = await fetch(`${QDRANT_URL}/collections`);
    if (!qdrantRes.ok) throw new Error(`Qdrant failed: ${qdrantRes.statusText}`);
    const qdrantJson = await qdrantRes.json();
    console.log(`✅ Qdrant service working (Found ${qdrantJson.result?.collections?.length || 0} collections)`);
  } catch (e) {
    console.error('❌ Qdrant test failed:', e.message);
    process.exit(1);
  }
  
  console.log('🎉 All systems go!');
}

smokeTest();

