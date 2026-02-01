/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MEMORY JANITOR SERVICE
 * Background process for memory hygiene and crystallization
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Prevents "context rot" by:
 *   1. Finding stale episodic memories (older than 24 hours)
 *   2. Using Groq to crystallize them into semantic facts
 *   3. Replacing old vectors with new, condensed knowledge
 * 
 * Why Groq? It processes huge context windows for summarization instantly.
 */

import Groq from 'groq-sdk';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { GroqModels } from './provider-factory';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface EpisodicMemory {
  id: string;
  userId: string;
  agentId: string;
  content: string;
  type: 'episodic' | 'semantic' | 'fact';
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface SemanticFact {
  id: string;
  content: string;
  sourceMemoryIds: string[];
  confidence: number;
  category: string;
}

export const CrystallizationResultSchema = z.object({
  facts: z.array(z.object({
    content: z.string(),
    category: z.string(),
    confidence: z.number().min(0).max(1)
  })),
  summary: z.string().max(500),
  preserveOriginals: z.array(z.string()).describe('IDs of memories that should NOT be deleted')
});

export type CrystallizationResult = z.infer<typeof CrystallizationResultSchema>;

export interface JanitorRunResult {
  processedMemories: number;
  createdFacts: number;
  deletedMemories: number;
  preservedMemories: number;
  errors: string[];
  durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY JANITOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class MemoryJanitor {
  private groqClient: Groq | null = null;
  private readonly qdrantUrl: string;
  private readonly collectionName = 'memories';
  
  constructor() {
    this.qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.initializeGroqClient();
  }
  
  private initializeGroqClient(): void {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.groqClient = new Groq({ apiKey });
      console.log('[MemoryJanitor] Groq client initialized');
    } else {
      console.warn('[MemoryJanitor] GROQ_API_KEY not set');
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // MAIN JANITOR PROCESS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Run the memory janitor for a specific user
   * This should be called by a cron job or background task
   */
  async run(userId: string, agentId: string = 'universe'): Promise<JanitorRunResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processedMemories = 0;
    let createdFacts = 0;
    let deletedMemories = 0;
    let preservedMemories = 0;
    
    console.log(`[MemoryJanitor] Starting run for user: ${userId}, agent: ${agentId}`);
    
    try {
      // Step 1: Find stale episodic memories
      const staleMemories = await this.findStaleEpisodicMemories(userId, agentId);
      processedMemories = staleMemories.length;
      
      if (staleMemories.length === 0) {
        console.log('[MemoryJanitor] No stale memories found');
        return {
          processedMemories: 0,
          createdFacts: 0,
          deletedMemories: 0,
          preservedMemories: 0,
          errors: [],
          durationMs: Date.now() - startTime
        };
      }
      
      console.log(`[MemoryJanitor] Found ${staleMemories.length} stale memories to process`);
      
      // Step 2: Crystallize memories into facts using Groq
      const crystallization = await this.crystallizeMemories(staleMemories);
      
      // Step 3: Create new semantic fact vectors
      for (const fact of crystallization.facts) {
        try {
          await this.createSemanticFact(userId, agentId, fact, staleMemories.map(m => m.id));
          createdFacts++;
        } catch (err: any) {
          errors.push(`Failed to create fact: ${err.message}`);
        }
      }
      
      // Step 4: Delete old episodic memories (except preserved ones)
      const toDelete = staleMemories
        .map(m => m.id)
        .filter(id => !crystallization.preserveOriginals.includes(id));
      
      preservedMemories = crystallization.preserveOriginals.length;
      
      for (const memoryId of toDelete) {
        try {
          await this.deleteMemory(memoryId);
          deletedMemories++;
        } catch (err: any) {
          errors.push(`Failed to delete memory ${memoryId}: ${err.message}`);
        }
      }
      
      console.log(`[MemoryJanitor] Run complete: ${createdFacts} facts created, ${deletedMemories} memories deleted`);
      
    } catch (error: any) {
      errors.push(`Fatal error: ${error.message}`);
      console.error('[MemoryJanitor] Fatal error:', error);
    }
    
    return {
      processedMemories,
      createdFacts,
      deletedMemories,
      preservedMemories,
      errors,
      durationMs: Date.now() - startTime
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // QDRANT OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Find episodic memories older than 24 hours
   */
  private async findStaleEpisodicMemories(
    userId: string,
    agentId: string
  ): Promise<EpisodicMemory[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const timestampThreshold = twentyFourHoursAgo.getTime();
    
    try {
      const response = await fetch(`${this.qdrantUrl}/collections/${this.collectionName}/points/scroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: {
            must: [
              { key: 'userId', match: { value: userId } },
              { key: 'agentId', match: { value: agentId } },
              { key: 'type', match: { value: 'episodic' } },
              { key: 'createdAt', range: { lt: timestampThreshold } }
            ]
          },
          limit: 100,
          with_payload: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Qdrant scroll failed: ${response.status}`);
      }
      
      const data = await response.json();
      const points = data.result?.points || [];
      
      return points.map((point: any) => ({
        id: point.id,
        userId: point.payload?.userId,
        agentId: point.payload?.agentId,
        content: point.payload?.content || '',
        type: point.payload?.type || 'episodic',
        createdAt: new Date(point.payload?.createdAt || 0),
        metadata: point.payload
      }));
      
    } catch (error: any) {
      console.error('[MemoryJanitor] Failed to fetch stale memories:', error);
      return [];
    }
  }
  
  /**
   * Create a new semantic fact vector
   */
  private async createSemanticFact(
    userId: string,
    agentId: string,
    fact: { content: string; category: string; confidence: number },
    sourceIds: string[]
  ): Promise<void> {
    // Generate embedding for the fact
    const embedding = await this.generateEmbedding(fact.content);
    
    const pointId = uuidv4();
    const payload = {
      userId,
      agentId,
      content: fact.content,
      type: 'semantic',
      category: fact.category,
      confidence: fact.confidence,
      sourceMemoryIds: sourceIds,
      createdAt: Date.now(),
      crystallizedAt: Date.now()
    };
    
    await fetch(`${this.qdrantUrl}/collections/${this.collectionName}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [{
          id: pointId,
          vector: embedding,
          payload
        }]
      })
    });
    
    console.log(`[MemoryJanitor] Created semantic fact: ${fact.content.slice(0, 50)}...`);
  }
  
  /**
   * Delete a memory point from Qdrant
   */
  private async deleteMemory(memoryId: string): Promise<void> {
    await fetch(`${this.qdrantUrl}/collections/${this.collectionName}/points/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [memoryId]
      })
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // GROQ CRYSTALLIZATION
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Use Groq to crystallize episodic memories into semantic facts
   */
  private async crystallizeMemories(memories: EpisodicMemory[]): Promise<CrystallizationResult> {
    if (!this.groqClient) {
      // Return empty result if no Groq client
      return { facts: [], summary: 'Groq client not available', preserveOriginals: memories.map(m => m.id) };
    }
    
    const memoryContents = memories.map((m, i) => 
      `[Memory ${i + 1} - ID: ${m.id}]\n${m.content}`
    ).join('\n\n---\n\n');
    
    const systemPrompt = `You are a memory crystallization engine. Your job is to:
1. Analyze a collection of episodic memories (raw experiences/conversations)
2. Extract timeless semantic facts (knowledge that remains true over time)
3. Identify which original memories should be preserved (important events, decisions)

RULES:
- Extract only truly factual, reusable information
- Combine related information into single facts
- Preserve memories that contain important decisions, commitments, or emotional significance
- Each fact should be standalone and searchable
- Categories: personal_info, preferences, skills, relationships, goals, facts, events

Respond with JSON matching this exact schema:
{
  "facts": [
    { "content": "The user prefers dark mode in all applications", "category": "preferences", "confidence": 0.95 }
  ],
  "summary": "Brief summary of what was processed",
  "preserveOriginals": ["memory-id-1", "memory-id-2"]
}`;

    const response = await this.groqClient.chat.completions.create({
      model: GroqModels.COMPLEX,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please crystallize these ${memories.length} memories into semantic facts:\n\n${memoryContents}` }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty crystallization response from Groq');
    }
    
    const parsed = JSON.parse(content);
    return CrystallizationResultSchema.parse(parsed);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // EMBEDDING GENERATION
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Generate embedding using the embeddings service
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const embeddingsUrl = process.env.EMBEDDINGS_BASE_URL || 'http://localhost:8080';
    
    const response = await fetch(`${embeddingsUrl}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error(`Embedding generation failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.embedding || data.vector || [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

let janitorInstance: MemoryJanitor | null = null;

export function getMemoryJanitor(): MemoryJanitor {
  if (!janitorInstance) {
    janitorInstance = new MemoryJanitor();
  }
  return janitorInstance;
}

export default MemoryJanitor;
