import { QDRANT_URL } from './config';
import { logEvent } from '@/lib/observability/logger';

export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload?: {
    content?: string;
    source?: string;
    [key: string]: any;
  };
}

export async function searchPoints(collection: string, vector: number[], limit: number = 5, filter?: any): Promise<QdrantSearchResult[]> {
  const startTime = Date.now();
  try {
    const body: any = {
      vector,
      limit,
      with_payload: true,
    };

    if (filter) {
      body.filter = filter;
    }

    const response = await fetch(`${QDRANT_URL}/collections/${collection}/points/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // If collection doesn't exist, we might return empty or throw
      if (response.status === 404) return [];
      throw new Error(`Qdrant search failed: ${response.statusText}. Memory System Offline - Check Container.`);
    }

    const data = await response.json();
    const endTime = Date.now();

    logEvent('MEMORY_SEARCH', {
      duration: endTime - startTime,
      collection,
      results_count: data.result?.length || 0
    });

    return data.result || [];
  } catch (error: any) {
    const endTime = Date.now();
    logEvent('ERROR', {
      type: 'MEMORY_SEARCH_FAILED',
      duration: endTime - startTime,
      collection,
      error: error.message
    });
    console.error('Qdrant search error:', error);
    return [];
  }
}

export async function upsertPoint(collection: string, point: { id: string | number; vector: number[]; payload?: any }) {
  const startTime = Date.now();
  try {
    // Ensure collection exists (basic check, in prod we might want to separate this)
    // For now we assume collection management happens elsewhere or we just try to upsert
    // Qdrant HTTP API: PUT /collections/{collection_name}/points

    const response = await fetch(`${QDRANT_URL}/collections/${collection}/points?wait=true`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        points: [point],
      }),
    });

    if (!response.ok) {
      throw new Error(`Qdrant upsert failed: ${response.statusText}. Memory System Offline - Check Container.`);
    }

    const result = await response.json();
    const endTime = Date.now();

    logEvent('INGESTION', {
      duration: endTime - startTime,
      collection,
      operation: 'upsert',
      status: 'success'
    });

    return result;
  } catch (error: any) {
    const endTime = Date.now();
    logEvent('ERROR', {
      type: 'UPSERT_FAILED',
      duration: endTime - startTime,
      collection,
      error: error.message
    });
    console.error('Qdrant upsert error:', error);
    throw error;
  }
}

export async function deletePoint(collection: string, id: string | number) {
  const startTime = Date.now();
  try {
    const response = await fetch(`${QDRANT_URL}/collections/${collection}/points/delete?wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        points: [id],
      }),
    });

    if (!response.ok) {
      throw new Error(`Qdrant delete failed: ${response.statusText}. Memory System Offline - Check Container.`);
    }

    const result = await response.json();
    const endTime = Date.now();

    logEvent('MEMORY_DELETE', {
      duration: endTime - startTime,
      collection,
      point_id: id,
      status: 'success'
    });

    return result;
  } catch (error: any) {
    const endTime = Date.now();
    logEvent('ERROR', {
      type: 'DELETE_FAILED',
      duration: endTime - startTime,
      collection,
      error: error.message
    });
    console.error('Qdrant delete error:', error);
    throw error;
  }
}

export async function scrollPoints(collection: string, limit: number = 100, filter?: any): Promise<QdrantSearchResult[]> {
  const startTime = Date.now();
  try {
    const body: any = {
      limit,
      with_payload: true,
      with_vector: false,
    };

    if (filter) {
      body.filter = filter;
    }

    const response = await fetch(`${QDRANT_URL}/collections/${collection}/points/scroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Qdrant scroll failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result?.points || [];
  } catch (error: any) {
    console.error('Qdrant scroll error:', error);
    return [];
  }
}
