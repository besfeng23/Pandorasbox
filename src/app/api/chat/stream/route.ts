import { NextRequest } from 'next/server';
import { getAuthAdmin } from '@/lib/firebase-admin';
import { ai } from '@/ai/genkit';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Streaming chat API route
 * Returns Server-Sent Events (SSE) for real-time message streaming
 */
export async function POST(request: NextRequest) {
  try {
    const { message, threadId, idToken, imageBase64, audioUrl } = await request.json();

    if (!idToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify user
    const auth = getAuthAdmin();
    const decoded = await auth.verifyIdToken(idToken);
    const userId = decoded.uid;

    if (!message && !imageBase64 && !audioUrl) {
      return new Response(JSON.stringify({ error: 'Message required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const firestoreAdmin = getFirestoreAdmin();
    const historyCollection = firestoreAdmin.collection('history');

    // Create assistant message placeholder
    const assistantRef = historyCollection.doc();
    const assistantMessageId = assistantRef.id;
    
    await assistantRef.set({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      status: 'processing',
      userId: userId,
      threadId: threadId,
      createdAt: FieldValue.serverTimestamp(),
      progress_log: ['Starting response...'],
    });

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // Get user settings for model selection
          const settingsDoc = await firestoreAdmin.collection('settings').doc(userId).get();
          const settings = { active_model: 'gemini-1.5-pro', ...settingsDoc.data() };
          
          const modelName = settings.active_model.includes('gemini') 
            ? `vertexai/${settings.active_model}` 
            : 'vertexai/gemini-1.5-pro';

          // Build prompt
          const prompt: any[] = [];
          prompt.push({ 
            text: `You are Pandora, an advanced AI assistant. Be helpful, concise, and engaging.` 
          });
          
          if (imageBase64) {
            prompt.push({ media: { url: imageBase64 } });
            prompt.push({ text: message || "Describe this image." });
          } else if (audioUrl) {
            prompt.push({ media: { url: audioUrl } });
            prompt.push({ text: message || "Listen to this audio and respond." });
          } else {
            prompt.push({ text: message });
          }

          // Use Genkit's generate API
          // Note: Genkit's generate() returns a completion object with text
          // For true streaming, we'd need generateStream() if available
          // For now, we'll stream the response in chunks for real-time feel
          const completion = await ai.generate({
            model: modelName,
            prompt: prompt,
            config: {
              temperature: 0.7,
              googleSearchRetrieval: {
                disableAttribution: false
              }
            }
          });

          // Stream the response in chunks for real-time display
          const response = completion.text;
          const chunkSize = 15; // Characters per chunk for smooth streaming
          let accumulatedContent = '';
          
          for (let i = 0; i < response.length; i += chunkSize) {
            const chunk = response.slice(i, i + chunkSize);
            accumulatedContent += chunk;
            
            const data = JSON.stringify({ 
              type: 'chunk', 
              content: chunk,
              messageId: assistantMessageId 
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            
            // Update Firestore periodically (every 50 chars) to avoid too many writes
            if (i % 50 === 0 || i + chunkSize >= response.length) {
              await assistantRef.update({
                content: accumulatedContent,
                progress_log: FieldValue.arrayUnion(`Streaming... ${Math.min(100, Math.round((accumulatedContent.length / response.length) * 100))}%`),
              }).catch(() => {}); // Don't fail on Firestore updates
            }
            
            // Small delay for smooth streaming effect
            await new Promise(resolve => setTimeout(resolve, 15));
          }

          // Final update with complete response
          await assistantRef.update({
            content: response,
            status: 'complete',
            progress_log: FieldValue.arrayUnion('Done.'),
          });

          // Send completion event
          const doneData = JSON.stringify({ 
            type: 'done', 
            messageId: assistantMessageId 
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          
        } catch (error: any) {
          console.error('[Stream] Error:', error);
          await assistantRef.update({
            content: `Error: ${error.message || 'Failed to generate response'}`,
            status: 'error',
          }).catch(() => {});
          
          const errorData = JSON.stringify({ 
            type: 'error', 
            error: error.message,
            messageId: assistantMessageId 
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('[Stream Route] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

