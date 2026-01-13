import { Firestore, Timestamp } from '@google-cloud/firestore';

export type DedupeStore = {
  /**
   * Returns true if this dedupe key was already seen (not expired).
   * If not seen, records it with TTL and returns false.
   */
  isDuplicateAndRecord(dedupeKey: string): Promise<boolean>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

class MemoryDedupeStore implements DedupeStore {
  private map = new Map<string, number>(); // dedupeKey -> expiresAtMs

  async isDuplicateAndRecord(dedupeKey: string): Promise<boolean> {
    const now = Date.now();
    const exp = this.map.get(dedupeKey);
    if (exp && exp > now) return true;

    // cleanup opportunistically
    if (this.map.size > 10_000) {
      for (const [k, v] of this.map.entries()) {
        if (v <= now) this.map.delete(k);
      }
    }

    this.map.set(dedupeKey, now + DAY_MS);
    return false;
  }
}

class FirestoreDedupeStore implements DedupeStore {
  constructor(private firestore: Firestore, private collectionName: string) {}

  async isDuplicateAndRecord(dedupeKey: string): Promise<boolean> {
    const ref = this.firestore.collection(this.collectionName).doc(dedupeKey);
    const nowMs = Date.now();
    const expiresAt = new Date(nowMs + DAY_MS);

    // Transaction prevents double-counting if GitHub retries quickly.
    return await this.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        const data = snap.data() ?? {};
        const exp = data.expiresAt;
        const expMs =
          exp instanceof Timestamp ? exp.toMillis() : exp instanceof Date ? exp.getTime() : typeof exp === 'number' ? exp : 0;
        if (expMs > nowMs) return true;
      }

      tx.set(
        ref,
        {
          createdAt: new Date(nowMs),
          expiresAt, // Firestore TTL should be configured on this field
        },
        { merge: true }
      );
      return false;
    });
  }
}

function hasFirestoreEnv(): boolean {
  // Cloud Run typically sets GOOGLE_CLOUD_PROJECT. Local dev may use FIRESTORE_EMULATOR_HOST.
  return Boolean((process.env.GOOGLE_CLOUD_PROJECT ?? '').trim() || (process.env.FIRESTORE_EMULATOR_HOST ?? '').trim());
}

export function createDedupeStore(): DedupeStore {
  const mode = (process.env.DEDUPE_MODE ?? '').trim().toLowerCase();
  if (mode === 'memory') return new MemoryDedupeStore();

  if (!hasFirestoreEnv()) return new MemoryDedupeStore();

  try {
    const firestore = new Firestore();
    return new FirestoreDedupeStore(firestore, 'kairos_webhook_dedupe');
  } catch {
    return new MemoryDedupeStore();
  }
}


