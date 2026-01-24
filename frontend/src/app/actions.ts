'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Memory, SearchResult, Thread, Message, UserConnector } from '@/lib/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';

/**
 * SOVEREIGN AI STACK: Fetches memories directly from backend (Qdrant via semantic search).
 */
export async function fetchMemories(userId: string, agentId: string, queryText: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/memories?userId=${userId}&agentId=${agentId}&query=${encodeURIComponent(queryText)}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to fetch memories from backend');
    return await response.json();
  } catch (error) {
    console.error('Error in fetchMemories action:', error);
    // Fallback or empty list
    return [];
  }
}

export async function deleteMemoryFromMemories(id: string, userId: string, agentId: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/memories/${id}?userId=${userId}&agentId=${agentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete memory from backend');
    revalidatePath('/memory');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateMemoryInMemories(id: string, newText: string, userId: string, agentId: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/memories/${id}?userId=${userId}&agentId=${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newText }),
    });
    if (!response.ok) throw new Error('Failed to update memory on backend');
    revalidatePath('/memory');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function createMemoryFromSettings(content: string, userId: string, agentId: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/memories?userId=${userId}&agentId=${agentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error('Failed to create memory on backend');
    revalidatePath('/memory');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getRecentThreads(userId: string, agent?: string): Promise<Thread[]> {
  try {
    let url = `${BACKEND_URL}/api/threads?userId=${userId}`;
    if (agent) {
      url += `&agent=${agent}`;
    }
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch threads:', response.status, errorText);
        // Don't throw to prevent UI crash, just return empty
        return [];
    }
    const data = await response.json();
    return data.threads || [];
  } catch (error) {
    console.error('Error in getRecentThreads action:', error);
    return [];
  }
}

export async function getThread(threadId: string, userId: string): Promise<Thread | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/threads/${threadId}?userId=${userId}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.thread;
  } catch (error) {
    console.error('Error in getThread action:', error);
    return null;
  }
}

export async function getMessages(threadId: string, userId: string): Promise<Message[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/threads/${threadId}/messages?userId=${userId}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to fetch messages from backend');
    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error in getMessages action:', error);
    return [];
  }
}

export async function getUserConnectors(userId: string): Promise<UserConnector[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/connectors?userId=${userId}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to fetch connectors from backend');
    const data = await response.json();
    return data.connectors || [];
  } catch (error) {
    console.error('Error in getUserConnectors action:', error);
    return [];
  }
}

export async function createThread(agent: 'builder' | 'universe', userId: string) {
  if (!userId) throw new Error('User not authenticated');

  try {
      const response = await fetch(`${BACKEND_URL}/api/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent, userId }),
      });

      if (!response.ok) {
          throw new Error('Failed to create thread');
      }

      const data = await response.json();
      revalidatePath('/');
      redirect(`/chat/${data.id}`);
  } catch (error) {
      console.error('Error creating thread:', error);
      throw error;
  }
}

export async function renameThread(threadId: string, newName: string, userId: string) {
  if (!userId) throw new Error('User not authenticated');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: newName }),
    });

    if (!response.ok) {
        throw new Error('Failed to rename thread');
    }

    revalidatePath('/');
    revalidatePath(`/chat/${threadId}`);
  } catch (error) {
    console.error('Error renaming thread:', error);
    throw error;
  }
}

export async function deleteThread(threadId: string, userId: string) {
  if (!userId) throw new Error('User not authenticated');

  try {
    const response = await fetch(`${BACKEND_URL}/api/threads/${threadId}?userId=${userId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Failed to delete thread');
    }

    revalidatePath('/');
    revalidatePath(`/chat/${threadId}`);
    redirect('/');
  } catch (error) {
      console.error('Error deleting thread:', error);
      throw error;
  }
}

export async function deleteMemoryAction(memoryId: string, userId: string) {
    // This seems to overlap with deleteMemoryFromMemories but used in different context?
    // Consolidating to use the same backend endpoint logic
    return deleteMemoryFromMemories(memoryId, userId, 'builder'); // Defaulting agent
}

export async function deleteMessage(threadId: string, messageId: string, userId: string) {
    if (!userId) throw new Error('User not authenticated');

    // Need to implement delete message endpoint on backend first
    // For now, assuming it might be implemented or using existing pattern
    try {
        const response = await fetch(`${BACKEND_URL}/api/threads/${threadId}/messages/${messageId}?userId=${userId}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            // If backend endpoint doesn't exist yet, we might have an issue. 
            // But we are removing Client SDK usage so we must rely on API.
            console.warn('Backend DELETE message endpoint might be missing');
        }
        revalidatePath(`/chat/${threadId}`);
    } catch (error) {
        console.error('Error deleting message:', error);
    }
}

export async function connectDataSource(
  userId: string,
  connectorId: string,
  metadata?: Record<string, any>
) {
    // This needs a backend endpoint too. 
    // Implementing via generic fetch for now assuming future backend support
    try {
        await fetch(`${BACKEND_URL}/api/connectors/${connectorId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, status: 'connected', metadata }),
        });
        revalidatePath('/connectors');
    } catch (error) {
        console.error('Error connecting data source:', error);
    }
}

export async function disconnectDataSource(userId: string, connectorId: string) {
    try {
        await fetch(`${BACKEND_URL}/api/connectors/${connectorId}`, {
            method: 'DELETE', // or PATCH status=disconnected
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        revalidatePath('/connectors');
    } catch (error) {
        console.error('Error disconnecting data source:', error);
    }
}
