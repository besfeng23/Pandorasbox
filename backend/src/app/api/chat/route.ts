import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages, tool, type UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { embedText } from '@/lib/ai/embedding';
import { searchPoints, upsertPoint } from '@/lib/sovereign/qdrant-client';
import { completeInference } from '@/lib/sovereign/inference';
import { v4 as uuidv4 } from 'uuid';

// Configure OpenAI provider with custom URL if set
const openai = createOpenAI({
  baseURL: process.env.INFERENCE_URL || process.env.LLM_API_URL || undefined,
  apiKey: process.env.LLM_API_KEY || 'dummy-key',
});

export const maxDuration = 60; // Allow 60 seconds for generation

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate User
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];

    // Verify token using Firebase Admin
    const auth = getAuthAdmin();
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (e) {
      console.error('Token verification failed:', e);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // 2. Parse Body
    const body = await req.json();
    const { message, agentId = 'universe', threadId, history = [], attachments = [] } = body; // Map 'message' to current user prompt

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    // 3. Save User Message to Firestore
    const db = getFirestoreAdmin();
    const userMessageRef = db.collection(`users/${userId}/agents/${agentId}/history`).doc();
    const userMessageData = {
      role: 'user',
      content: message,
      threadId,
      createdAt: FieldValue.serverTimestamp(), // Use server timestamp
    };

    // Non-blocking save (or await if critical)
    // We await it to ensure order
    await userMessageRef.set(userMessageData);

    // 4. Prepare Context for LLM
    // Convert frontend history to Vercel AI CoreMessages
    // Note: frontend sends { role, content }, match CoreMessage type
    const initialMessages = await convertToModelMessages(history);

    // Construct the current user message with multi-modal content if attachments exist
    const userContent: any[] = [{ type: 'text', text: message }];

    if (attachments && attachments.length > 0) {
      attachments.forEach((att: any) => {
        if (att.type.startsWith('image/')) {
          userContent.push({
            type: 'image',
            image: att.base64 || att.url, // Vercel AI SDK handles base64 data URLs or standard URLs
          });
        }
      });
    }

    const messages = [...initialMessages, { role: 'user', content: userContent } as const];

    // 4.5 RAG: Search for relevant context
    let context = '';
    try {
      if (message.length > 10) {
        const queryVector = await embedText(message);
        const filter = {
          must: [
            { key: 'userId', match: { value: userId } },
            { key: 'agentId', match: { value: agentId } }
          ]
        };
        const searchResults = await searchPoints('memories', queryVector, 5, filter);

        if (searchResults.length > 0) {
          context = "\n\nRelevant Context from your memory:\n" +
            searchResults.map(r => `- ${r.payload?.content}`).join('\n');
        }
      }
    } catch (ragError) {
      console.error('RAG Search failed:', ragError);
    }

    // 5. Stream from LLM
    const result = await streamText({
      // Use Gemini 1.5 Flash if images are present for high-quality vision, otherwise stay sovereign
      model: attachments.length > 0
        ? openai(process.env.VISION_MODEL || 'google/gemini-1.5-flash-latest')
        : openai(process.env.INFERENCE_MODEL || process.env.LLM_MODEL || 'llama-3'),
      messages,
      tools: {
        generate_artifact: tool({
          description: 'Generate a high-quality artifact such as code, a document, an SVG, or a diagram. Use this for significant pieces of work that should be viewed in a separate panel.',
          inputSchema: z.object({
            title: z.string().describe('The title of the artifact'),
            type: z.enum(['code', 'markdown', 'html', 'svg', 'react']).describe('The type of artifact'),
            language: z.string().optional().describe('The programming language (if applicable)'),
            content: z.string().describe('The full content of the artifact'),
          }),
          execute: async ({ title, type, content, language }: { title: string, type: 'code' | 'markdown' | 'html' | 'svg' | 'react', content: string, language?: string }) => {
            // This is called server-side when the tool is executed
            try {
              const db = getFirestoreAdmin();
              const artifactRef = db.collection('artifacts').doc();
              const id = artifactRef.id;
              await artifactRef.set({
                id,
                title,
                type,
                content,
                language: language || '',
                userId,
                threadId,
                createdAt: FieldValue.serverTimestamp(),
              });
              return { success: true, artifactId: id, message: 'Artifact generated and saved.' };
            } catch (error: any) {
              return { success: false, error: error.message };
            }
          },
        }),
      },
      system: `You are Pandora, an advanced Sovereign AI assistant. You operate on a high-end, private cloud infrastructure.

${agentId === 'builder' ? `
### Role: THE BUILDER 🏗️
- **Expertise**: Full-stack engineering, Cloud Architecture, POSIX compliance, and Low-latency systems.
- **Tone**: Precise, technical, and constructive.
- **Workflow**:
  1. Analyze requirements.
  2. Plan architecture using modular patterns.
  3. Provide production-ready, typed code.
  4. Explain design decisions and trade-offs.
- **Preference**: Prefers Next.js, TypeScript, Tailwind, and Firebase.
- **Tools**: Use 'generate_artifact' for any code implementation, complex diagrams, or long documentation.
` : `
### Role: THE UNIVERSE 🌌
- **Expertise**: Creative synthesis, Philosophical inquiry, Deep Knowledge exploration, and Cross-disciplinary connections.
- **Tone**: Wise, expansive, and poetic yet grounded.
- **Workflow**:
  1. Listen deeply to the user's intent.
  2. Synthesize information from multiple domains (Science, Art, History, Ethics).
  3. Offer provocative insights and creative metaphors.
  4. Maintain a sense of wonder and curiosity.
- **Preference**: High-density information delivery and elegant articulation.
- **Tools**: Use 'generate_artifact' for detailed philosophical papers, long creative stories, or complex knowledge maps.
`}

### Operational Guardrails:
- **Privacy**: You are private and sovereign. Do not disclose user memories unless relevant.
- **Integrity**: Cite your sources if relevant context is provided below.
- **Format**: Use clean Markdown with bold headers and lists for readability.

User ID: ${userId}${context}`,
      temperature: 0.7,
      onFinish: async ({ text, toolCalls }) => {
        // 6. Save Assistant Response on Finish
        try {
          const assistantMessageRef = db.collection(`users/${userId}/agents/${agentId}/history`).doc();
          await assistantMessageRef.set({
            role: 'assistant',
            content: text,
            threadId,
            createdAt: FieldValue.serverTimestamp(),
          });

          // 7. Update Thread 'updatedAt'
          await db.doc(`users/${userId}/threads/${threadId}`).update({
            updatedAt: FieldValue.serverTimestamp(),
          });

          // 7.5 Automated Long-term Memory (Consolidated Memory)
          // Only summarize if the response is significant
          if (text.length > 50) {
            try {
              const summaryPrompt = [
                { role: 'system' as const, content: 'You are a memory consolidation expert. Summarize the following exchange into a single, high-density factual statement for long-term storage.' },
                { role: 'user' as const, content: `User: ${message}\nAssistant: ${text}` }
              ];
              const summary = await completeInference(summaryPrompt);

              if (summary) {
                const summaryVector = await embedText(summary);
                await upsertPoint('memories', {
                  id: uuidv4(),
                  vector: summaryVector,
                  payload: {
                    content: summary,
                    userId,
                    agentId,
                    type: 'consolidated_memory',
                    source: 'chat_auto',
                    createdAt: new Date().toISOString()
                  }
                });
                console.log(`[Thread ${threadId}] Automated memory consolidated.`);
              }
            } catch (memoryError) {
              console.error('Failed to consolidate memory:', memoryError);
            }
          }
        } catch (saveError) {
          console.error('Failed to save assistant message:', saveError);
        }
      },
    });

    // 8. Return Stream Response
    return result.toUIMessageStreamResponse();

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
