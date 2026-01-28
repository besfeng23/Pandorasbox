import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';

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
    const { message, agentId = 'universe', threadId, history = [] } = body; // Map 'message' to current user prompt

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
    const messages = [...initialMessages, { role: 'user', content: message } as const];

    // 5. Stream from LLM
    const result = await streamText({
      model: openai(process.env.INFERENCE_MODEL || process.env.LLM_MODEL || 'llama-3'),
      messages,
      system: `You are Pandora, an advanced AI assistant. You are helpful, kind, and knowledgeable.
Agent Context: ${agentId === 'builder' ? 'You are acting as a Builder, focusing on code, architecture, and construction.' : 'You are acting as Universe, focusing on broad knowledge, creativity, and exploration.'}
User ID: ${userId}`,
      temperature: 0.7,
      onFinish: async ({ text }) => {
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
            // Optional: update snippet/name if new thread
          });
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
