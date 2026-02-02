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
import OpenAI from 'openai';

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
  async run(uid: string, agentId: string = 'universe'): Promise<JanitorRunResult> {
    const errors: string[] = [];
    let processedMemories = 0;
    let createdFacts = 0;
    let deletedMemories = 0;

    try {
      // 1. Fetch last 100 Memories from Qdrant (excluding facts)
      const memories = await this.fetchRecentMemories(uid, agentId, 100);
      processedMemories = memories.length;

      if (memories.length === 0) {
        return { processedMemories: 0, createdFacts: 0, deletedMemories: 0, errors: [] };
      }

      // 2. Synthesize using OpenAI (more reliable in this env) or Gemini
      let facts: string[] = [];
      const prompt = `You are a Knowledge Base Manager. Your goal is to compress the following chat logs into a set of high-density factual statements.
Discard greetings, small talk, and redundant fragments.
Preserve specific technical details, user preferences, configuration values, life events, and recurring themes.

CHAT FRAGMENTS:
${memories.map((m: { content: string }) => `- ${m.content}`).join('\n')}

Respond with a JSON object containing a 'facts' array of strings. 
Example: { "facts": ["User prefers dark mode for all IDEs", "User is the lead developer of Coder Lane"] }`;

      const openaiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (openaiKey && openaiKey.startsWith('sk-')) {
        try {
          console.log(`[MemoryJanitor] Attempting synthesis with OpenAI (gpt-4o)...`);
          const openai = new OpenAI({ apiKey: openaiKey });
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt + "\n\nIMPORTANT: Return a JSON object with a 'facts' key containing the array." }],
            response_format: { type: "json_object" }
          });
          const content = response.choices[0].message.content || '{}';
          console.log(`[MemoryJanitor] OpenAI Raw Response: ${content.substring(0, 100)}...`);
          const parsed = JSON.parse(content);
          facts = Array.isArray(parsed) ? parsed : (parsed.facts || parsed.statements || parsed.result || []);
          console.log(`[MemoryJanitor] Extracted ${facts.length} facts from OpenAI.`);
        } catch (e: any) {
          console.warn('[MemoryJanitor] OpenAI failed, falling back to Gemini:', e.message);
        }
      }

      if (facts.length === 0) {
        console.log(`[MemoryJanitor] Attempting synthesis with Gemini...`);
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
        const result = await model.generateContent(prompt);
        const output = result.response.text();
        const jsonString = output.match(/\[[\s\S]*\]/)?.[0] || '[]';
        facts = JSON.parse(jsonString);
        console.log(`[MemoryJanitor] Extracted ${facts.length} facts from Gemini.`);
      }

      // 3. Create "Crystallized Facts" in Qdrant
      for (const fact of facts) {
        await this.insertCrystallizedFact(uid, agentId, fact);
        createdFacts++;
      }

      // 4. Delete old fragments
      for (const m of memories) {
        await this.deletePoint(agentId, m.id);
        deletedMemories++;
      }

    } catch (err: any) {
      console.error('[MemoryJanitor] Run error:', err);
      errors.push(err.message);
    }

    return { processedMemories, createdFacts, deletedMemories, errors };
  }

  private async fetchRecentMemories(uid: string, agentId: string, limit: number) {
    const collectionName = `memories__${agentId}`;

    // Optional: Only process "decaying" memories (older than 7 days by default for this run)
    // In a real production environment, you might use 30 days.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(`${this.qdrantUrl}/collections/${collectionName}/points/scroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: {
          must: [
            { key: 'uid', match: { value: uid } }
          ],
          must_not: [
            { key: 'type', match: { value: 'fact' } },
            { key: 'type', match: { value: 'crystallized' } }
          ],
          should: [
            // Boost older memories for pruning
            { key: 'createdAt', range: { lt: sevenDaysAgo } }
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

  private async insertCrystallizedFact(uid: string, agentId: string, content: string) {
    const collectionName = `memories__${agentId}`;
    console.log(`[MemoryJanitor] Generating embedding for fact: ${content.substring(0, 50)}...`);
    const embedding = await this.generateEmbedding(content);
    console.log(`[MemoryJanitor] Inserting fact into ${collectionName}...`);
    const res = await fetch(`${this.qdrantUrl}/collections/${collectionName}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [{
          id: uuidv4(),
          vector: embedding,
          payload: {
            uid,
            agentId,
            content,
            type: 'fact',
            createdAt: new Date().toISOString()
          }
        }]
      })
    });
    const data = await res.json();
    console.log(`[MemoryJanitor] Fact insertion status: ${res.status}, Qdrant Status: ${JSON.stringify(data.status)}`);
    if (!res.ok || data.status === 'error') {
      throw new Error(`Qdrant fact insertion failed: ${res.status} - ${JSON.stringify(data.status)}`);
    }
  }

  private async deletePoint(agentId: string, id: string) {
    const collectionName = `memories__${agentId}`;
    const res = await fetch(`${this.qdrantUrl}/collections/${collectionName}/points/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: [id] })
    });
    if (!res.ok) {
      console.warn(`[MemoryJanitor] Failed to delete point ${id} from ${collectionName}: ${res.status}`);
    }
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
