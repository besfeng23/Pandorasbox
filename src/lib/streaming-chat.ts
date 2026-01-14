/**
 * Streaming chat utilities
 * Handles Server-Sent Events (SSE) for real-time message streaming
 */

export interface StreamChunk {
  type: 'chunk' | 'done' | 'error';
  content?: string;
  messageId?: string;
  error?: string;
}

/**
 * Stream a chat message and call onChunk for each chunk received
 */
export async function streamChatMessage(
  message: string,
  threadId: string | null,
  idToken: string,
  imageBase64?: string,
  audioUrl?: string,
  onChunk?: (chunk: StreamChunk) => void,
  onError?: (error: Error) => void
): Promise<string | null> {
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        threadId,
        idToken,
        imageBase64,
        audioUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to start stream');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data: StreamChunk = JSON.parse(line.slice(6));
            
            if (data.type === 'chunk' && data.content) {
              fullContent += data.content;
              onChunk?.({
                type: 'chunk',
                content: fullContent,
                messageId: data.messageId,
              });
            } else if (data.type === 'done') {
              onChunk?.({
                type: 'done',
                messageId: data.messageId,
              });
              return fullContent;
            } else if (data.type === 'error') {
              throw new Error(data.error || 'Stream error');
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', parseError);
          }
        }
      }
    }

    return fullContent;
  } catch (error) {
    onError?.(error as Error);
    throw error;
  }
}

