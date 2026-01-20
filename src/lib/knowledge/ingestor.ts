import { embedText } from '@/lib/ai/embedding';
import { upsertPoint } from '@/lib/sovereign/qdrant-client';
import { chunkText } from '@/lib/utils';
import { randomUUID } from 'crypto';

export async function processAndStore(content: string, source: string, agentId: string, userId: string) {
  // 1. Chunking
  const chunks = chunkText(content, 500, 50);

  // 2. Embedding & Storage
  let processedChunks = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Embed
    const vector = await embedText(chunk);
    
    // Store in Qdrant
    // Using a specific collection for external knowledge or mixing it with memories
    // Ideally we might have `knowledge_base` collection, or `memories_{agentId}` with type='external'
    const collectionName = `memories_${agentId}`; 
    
    await upsertPoint(collectionName, {
      id: randomUUID(),
      vector: vector,
      payload: {
        content: chunk,
        source: source,
        type: 'external',
        userId: userId,
        agentId: agentId,
        createdAt: new Date().toISOString()
      }
    });
    
    processedChunks++;
  }

  return { success: true, chunks: processedChunks };
}


