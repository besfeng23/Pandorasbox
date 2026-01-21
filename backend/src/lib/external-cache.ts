'use server';

/**
 * Phase 5: External Knowledge Fusion
 * 
 * External result caching for Tavily/web search results to reduce API calls
 * and improve response times for repeated queries.
 */

import { getFirestoreAdmin } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export interface CachedExternalResult {
  query: string;
  source: string;
  content: string;
  confidence: number;
  cachedAt: Date;
  url?: string;
  title?: string;
}

/**
 * Cache external search results in Firestore for future retrieval.
 * 
 * @param query - Original search query
 * @param results - External search results from Tavily
 */
export async function cacheExternalResults(
  query: string,
  results: Array<{ title: string; snippet: string; url: string }>
): Promise<void> {
  if (!query.trim() || results.length === 0) {
    return;
  }

  const firestoreAdmin = getFirestoreAdmin();
  const cacheCollection = firestoreAdmin.collection('external_knowledge');

  try {
    // Create cache entries for each result
    const cachePromises = results.map(async (result, index) => {
      // Calculate confidence based on position
      const positionConfidence = 1.0 - (index * 0.1);
      const confidence = Math.max(0.3, positionConfidence);

      const cacheData = {
        query: query.trim().toLowerCase(), // Normalize query for caching
        source: 'tavily',
        content: result.snippet || result.title || '',
        confidence,
        url: result.url || '',
        title: result.title || '',
        cachedAt: FieldValue.serverTimestamp(),
      };

      // Use query + url as a composite key to avoid duplicates
      const docId = `${query.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${index}`;
      await cacheCollection.doc(docId).set(cacheData, { merge: true });
    });

    await Promise.all(cachePromises);
    console.log(`[cacheExternalResults] Cached ${results.length} external results for query: "${query}"`);

  } catch (error: any) {
    console.error(`[cacheExternalResults] Error caching external results:`, error);
    // Don't throw - caching failures shouldn't break the search flow
  }
}

/**
 * Retrieve cached external search results from Firestore.
 * 
 * @param query - Search query to look up
 * @param maxAgeHours - Maximum age of cached results in hours (default: 24)
 * @returns Array of cached results, or empty array if none found or expired
 */
export async function getCachedResults(
  query: string,
  maxAgeHours: number = 24
): Promise<CachedExternalResult[]> {
  if (!query.trim()) {
    return [];
  }

  const firestoreAdmin = getFirestoreAdmin();
  const cacheCollection = firestoreAdmin.collection('external_knowledge');

  try {
    const normalizedQuery = query.trim().toLowerCase();
    
    // Query for cached results matching this query
    const snapshot = await cacheCollection
      .where('query', '==', normalizedQuery)
      .orderBy('cachedAt', 'desc')
      .limit(10)
      .get();

    if (snapshot.empty) {
      return [];
    }

    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

    const cachedResults: CachedExternalResult[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const cachedAt = data.cachedAt instanceof Timestamp
        ? data.cachedAt.toDate()
        : new Date(data.cachedAt);

      // Check if cache is still valid
      const age = now.getTime() - cachedAt.getTime();
      if (age > maxAge) {
        // Cache expired, optionally delete the document
        // (For now, we just skip it - cleanup can be done by a scheduled job)
        continue;
      }

      cachedResults.push({
        query: data.query,
        source: data.source || 'tavily',
        content: data.content || '',
        confidence: data.confidence || 0.5,
        cachedAt,
        url: data.url,
        title: data.title,
      });
    }

    console.log(`[getCachedResults] Found ${cachedResults.length} cached results for query: "${query}"`);

    // Sort by confidence (descending)
    return cachedResults.sort((a, b) => b.confidence - a.confidence);

  } catch (error: any) {
    console.error(`[getCachedResults] Error retrieving cached results:`, error);
    return [];
  }
}

/**
 * Clear expired cache entries (useful for cleanup jobs).
 * 
 * @param maxAgeHours - Maximum age in hours before considering entries expired
 * @returns Number of deleted entries
 */
export async function clearExpiredCache(maxAgeHours: number = 24 * 7): Promise<number> {
  const firestoreAdmin = getFirestoreAdmin();
  const cacheCollection = firestoreAdmin.collection('external_knowledge');

  try {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    const cutoffDate = new Date(now.getTime() - maxAge);

    // Query for expired entries
    const snapshot = await cacheCollection
      .where('cachedAt', '<', Timestamp.fromDate(cutoffDate))
      .limit(100) // Process in batches
      .get();

    if (snapshot.empty) {
      return 0;
    }

    // Delete expired entries
    const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);

    console.log(`[clearExpiredCache] Deleted ${snapshot.docs.length} expired cache entries`);

    return snapshot.docs.length;

  } catch (error: any) {
    console.error(`[clearExpiredCache] Error clearing expired cache:`, error);
    return 0;
  }
}

