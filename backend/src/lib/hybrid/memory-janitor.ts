/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MEMORY JANITOR SERVICE (GEMINI 1.5 PRO VERSION)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Role: The Architect (Brain B). 
 * Uses Gemini 1.5 Pro's huge context window to synthesize episodic memories
 * into concise factual statements ("Crystallized Facts").
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

export interface JanitorRunResult {
  processedMemories: number;
  createdFacts: number;
  deletedMemories: number;
  errors: string[];
}

export class MemoryJanitor {
  private genAI: GoogleGenerativeAI;
  private readonly qdrantUrl: string;
  private readonly collectionName: string;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
    this.qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.collectionName = process.env.QDRANT_COLLECTION || 'memories';
  }

  /**
   * Run the synthesis process for a user
   */
  async run(userId: string, agentId: string = 'universe'): Promise<JanitorRunResult> {
    const errors: string[] = [];
    let processedMemories = 0;
    let createdFacts = 0;
    let deletedMemories = 0;

    try {
      // 1. Fetch last 100 Episodic Memories from Qdrant
      const memories = await this.fetchRecentMemories(userId, agentId, 100);
      processedMemories = memories.length;

      if (memories.length === 0) {
        return { processedMemories: 0, createdFacts: 0, deletedMemories: 0, errors: [] };
      }

      // 2. Pass to Gemini 1.5 Pro for synthesis
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
      const prompt = `Synthesize these ${memories.length} chat fragments into concise factual statements about the user.
Focus on extracting persistent preferences, life events, emotional states, and recurring themes.

CHAT FRAGMENTS:
${memories.map(m => m.content).join('\n---\n')}

Respond with a JSON array of strings: ["Fact 1", "Fact 2", ...]`;

      const result = await model.generateContent(prompt);
      const output = result.response.text();

      // Basic JSON cleaning if necessary
      const jsonString = output.match(/\[.*\]/s)?.[0] || '[]';
      const facts: string[] = JSON.parse(jsonString);

      // 3. Create "Crystallized Facts" in Qdrant
      for (const fact of facts) {
        await this.insertCrystallizedFact(userId, agentId, fact);
        createdFacts++;
      }

      // 4. Delete old fragments
      for (const m of memories) {
        await this.deletePoint(m.id);
        deletedMemories++;
      }

    } catch (err: any) {
      console.error('[MemoryJanitor] Run error:', err);
      errors.push(err.message);
    }

    return { processedMemories, createdFacts, deletedMemories, errors };
  }

  private async fetchRecentMemories(userId: string, agentId: string, limit: number) {
    const response = await fetch(`${this.qdrantUrl}/collections/${this.collectionName}/points/scroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: {
          must: [
            { key: 'userId', match: { value: userId } },
            { key: 'type', match: { value: 'episodic' } }
          ]
        },
        limit,
        with_payload: true
      })
    });
    const data = await response.json();
    return (data.result?.points || []).map((p: any) => ({
      id: p.id,
      content: p.payload?.content || ''
    }));
  }

  private async insertCrystallizedFact(userId: string, agentId: string, content: string) {
    const embedding = await this.generateEmbedding(content);
    await fetch(`${this.qdrantUrl}/collections/${this.collectionName}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [{
          id: uuidv4(),
          vector: embedding,
          payload: {
            userId,
            agentId,
            content,
            type: 'crystallized_fact',
            createdAt: Date.now()
          }
        }]
      })
    });
  }

  private async deletePoint(id: string) {
    await fetch(`${this.qdrantUrl}/collections/${this.collectionName}/points/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: [id] })
    });
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const embeddingsUrl = process.env.EMBEDDINGS_BASE_URL || 'http://localhost:8080';
    const response = await fetch(`${embeddingsUrl}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    return data.embedding || data.vector || [];
  }
}

let instance: MemoryJanitor | null = null;
export function getMemoryJanitor() {
  if (!instance) instance = new MemoryJanitor();
  return instance;
}
