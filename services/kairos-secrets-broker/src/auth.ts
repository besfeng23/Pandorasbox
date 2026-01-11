/**
 * HMAC Signature Verification and Replay Protection
 */

import { createHmac, timingSafeEqual } from 'crypto';

// Inject via Cloud Run Secret Manager binding
const RAW_BOOTSTRAP_SECRET = process.env.KAIROS_BOOTSTRAP_SECRET;

if (!RAW_BOOTSTRAP_SECRET) {
  console.error('❌ Missing KAIROS_BOOTSTRAP_SECRET (bind from Secret Manager)');
  process.exit(1);
}

// Trim secret aggressively to eliminate all whitespace/newline/BOM issues
// Cloud Run Secret Manager can inject various whitespace characters
const BOOTSTRAP_SECRET = RAW_BOOTSTRAP_SECRET.trim().replace(/^\uFEFF/, ''); // Remove BOM and all whitespace

// Fail fast if secret looks wrong after normalization
if (!BOOTSTRAP_SECRET || BOOTSTRAP_SECRET.length < 32) {
  console.error(`❌ KAIROS_BOOTSTRAP_SECRET invalid length after normalization: ${BOOTSTRAP_SECRET.length} (expected >= 32)`);
  process.exit(1);
}

const REPLAY_WINDOW_MS = 5 * 60 * 1000; // ±5 minutes

/**
 * Verify HMAC signature for a request.
 * 
 * Signature format: base64(HMAC_SHA256(BOOTSTRAP_SECRET, `${timestamp}.${rawBody}`))
 * 
 * @param signature Base64-encoded HMAC signature from request header
 * @param timestamp Unix timestamp in milliseconds (string or number)
 * @param rawBody Raw request body as string
 * @returns true if signature is valid
 */
export function verifySignature(
  signature: string,
  timestamp: string | number,
  rawBody: string
): boolean {
  if (!signature || !timestamp || rawBody === undefined) {
    return false;
  }

  try {
    // Reconstruct the message
    const message = `${timestamp}.${rawBody}`;
    
    // Compute expected signature
    const hmac = createHmac('sha256', BOOTSTRAP_SECRET!);
    hmac.update(message);
    const expectedSignature = hmac.digest('base64');

    // Compare signatures using timing-safe comparison
    const providedBuf = Buffer.from(signature, 'base64');
    const expectedBuf = Buffer.from(expectedSignature, 'base64');

    // Ensure buffers are same length (prevents timing attacks)
    if (providedBuf.length !== expectedBuf.length) {
      return false;
    }

    return timingSafeEqual(providedBuf, expectedBuf);
  } catch (error) {
    // Never log actual signature values
    return false;
  }
}

/**
 * Check if timestamp is within replay protection window (±5 minutes).
 * 
 * @param timestamp Unix timestamp in milliseconds
 * @returns true if timestamp is within acceptable window
 */
export function isWithinReplayWindow(timestamp: number): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= REPLAY_WINDOW_MS;
}

/**
 * Verify request signature and replay protection.
 * 
 * @param signature Base64-encoded HMAC signature
 * @param timestamp Unix timestamp in milliseconds
 * @param rawBody Raw request body
 * @returns Object with isValid boolean and error message if invalid
 */
export function verifyRequest(
  signature: string | undefined,
  timestamp: string | undefined,
  rawBody: string
): { isValid: boolean; error?: string } {
  if (!signature) {
    return { isValid: false, error: 'Missing signature header' };
  }

  if (!timestamp) {
    return { isValid: false, error: 'Missing timestamp header' };
  }

  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    return { isValid: false, error: 'Invalid timestamp format' };
  }

  // Check replay protection first (fail fast)
  if (!isWithinReplayWindow(timestampNum)) {
    return { isValid: false, error: 'Request timestamp outside replay window' };
  }

  // Verify signature
  if (!verifySignature(signature, timestampNum, rawBody)) {
    return { isValid: false, error: 'Invalid signature' };
  }

  return { isValid: true };
}

