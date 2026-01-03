'use server';

import { getFirestoreAdmin } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export type RateLimitType = 'messages' | 'embeddings' | 'uploads';

interface RateLimitConfig {
  requests: number;
  window: number; // in seconds
}

const RATE_LIMITS: Record<RateLimitType, RateLimitConfig> = {
  messages: { requests: 30, window: 60 }, // 30 per minute
  embeddings: { requests: 100, window: 3600 }, // 100 per hour
  uploads: { requests: 10, window: 3600 }, // 10 per hour
};

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
  message?: string;
}

/**
 * Checks if a user has exceeded the rate limit for a given operation type.
 * Uses a sliding window algorithm stored in Firestore.
 * 
 * @param userId - The user ID to check rate limits for
 * @param type - The type of operation (messages, embeddings, uploads)
 * @returns RateLimitResult indicating if the request is allowed and remaining quota
 */
export async function checkRateLimit(
  userId: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const firestoreAdmin = getFirestoreAdmin();
  const config = RATE_LIMITS[type];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.window * 1000);

  try {
    const rateLimitRef = firestoreAdmin
      .collection('rateLimits')
      .doc(`${userId}_${type}`);

    const doc = await rateLimitRef.get();
    const data = doc.data();

    if (!doc.exists || !data) {
      // First request - create the rate limit document
      await rateLimitRef.set({
        userId,
        type,
        requests: [now.getTime()],
        resetAt: new Date(now.getTime() + config.window * 1000),
      });

      return {
        success: true,
        remaining: config.requests - 1,
        resetAt: new Date(now.getTime() + config.window * 1000),
      };
    }

    // Filter out requests outside the time window
    const requests: number[] = (data.requests || []).filter(
      (timestamp: number) => timestamp > windowStart.getTime()
    );

    if (requests.length >= config.requests) {
      // Rate limit exceeded
      const resetAt = new Date(
        Math.min(...requests) + config.window * 1000
      );

      return {
        success: false,
        remaining: 0,
        resetAt,
        message: `Rate limit exceeded. Please try again after ${resetAt.toLocaleTimeString()}.`,
      };
    }

    // Add current request timestamp
    requests.push(now.getTime());
    const resetAt = new Date(Math.min(...requests) + config.window * 1000);

    // Update the document
    await rateLimitRef.set(
      {
        requests: requests,
        resetAt: resetAt,
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      remaining: config.requests - requests.length,
      resetAt: resetAt,
    };
  } catch (error) {
    // If rate limiting fails, allow the request (fail open)
    // This prevents rate limiting from breaking the application
    console.error(`Rate limit check failed for ${type}:`, error);
    return {
      success: true,
      remaining: config.requests,
      resetAt: new Date(now.getTime() + config.window * 1000),
    };
  }
}

/**
 * Gets the current rate limit status for a user and operation type.
 * 
 * @param userId - The user ID
 * @param type - The type of operation
 * @returns RateLimitResult with current status
 */
export async function getRateLimitStatus(
  userId: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const firestoreAdmin = getFirestoreAdmin();
  const config = RATE_LIMITS[type];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.window * 1000);

  try {
    const rateLimitRef = firestoreAdmin
      .collection('rateLimits')
      .doc(`${userId}_${type}`);

    const doc = await rateLimitRef.get();
    const data = doc.data();

    if (!doc.exists || !data) {
      return {
        success: true,
        remaining: config.requests,
        resetAt: new Date(now.getTime() + config.window * 1000),
      };
    }

    const requests: number[] = (data.requests || []).filter(
      (timestamp: number) => timestamp > windowStart.getTime()
    );

    const resetAt = data.resetAt?.toDate
      ? data.resetAt.toDate()
      : new Date(now.getTime() + config.window * 1000);

    return {
      success: requests.length < config.requests,
      remaining: Math.max(0, config.requests - requests.length),
      resetAt: resetAt,
    };
  } catch (error) {
    console.error(`Rate limit status check failed for ${type}:`, error);
    return {
      success: true,
      remaining: config.requests,
      resetAt: new Date(now.getTime() + config.window * 1000),
    };
  }
}

