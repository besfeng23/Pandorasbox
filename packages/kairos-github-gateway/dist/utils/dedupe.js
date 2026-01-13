"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDedupeStore = createDedupeStore;
const firestore_1 = require("@google-cloud/firestore");
const DAY_MS = 24 * 60 * 60 * 1000;
class MemoryDedupeStore {
    map = new Map(); // dedupeKey -> expiresAtMs
    async isDuplicateAndRecord(dedupeKey) {
        const now = Date.now();
        const exp = this.map.get(dedupeKey);
        if (exp && exp > now)
            return true;
        // cleanup opportunistically
        if (this.map.size > 10_000) {
            for (const [k, v] of this.map.entries()) {
                if (v <= now)
                    this.map.delete(k);
            }
        }
        this.map.set(dedupeKey, now + DAY_MS);
        return false;
    }
}
class FirestoreDedupeStore {
    firestore;
    collectionName;
    constructor(firestore, collectionName) {
        this.firestore = firestore;
        this.collectionName = collectionName;
    }
    async isDuplicateAndRecord(dedupeKey) {
        const ref = this.firestore.collection(this.collectionName).doc(dedupeKey);
        const nowMs = Date.now();
        const expiresAt = new Date(nowMs + DAY_MS);
        // Transaction prevents double-counting if GitHub retries quickly.
        return await this.firestore.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (snap.exists) {
                const data = snap.data() ?? {};
                const exp = data.expiresAt;
                const expMs = exp instanceof firestore_1.Timestamp ? exp.toMillis() : exp instanceof Date ? exp.getTime() : typeof exp === 'number' ? exp : 0;
                if (expMs > nowMs)
                    return true;
            }
            tx.set(ref, {
                createdAt: new Date(nowMs),
                expiresAt, // Firestore TTL should be configured on this field
            }, { merge: true });
            return false;
        });
    }
}
function hasFirestoreEnv() {
    // Cloud Run typically sets GOOGLE_CLOUD_PROJECT. Local dev may use FIRESTORE_EMULATOR_HOST.
    return Boolean((process.env.GOOGLE_CLOUD_PROJECT ?? '').trim() || (process.env.FIRESTORE_EMULATOR_HOST ?? '').trim());
}
function createDedupeStore() {
    const mode = (process.env.DEDUPE_MODE ?? '').trim().toLowerCase();
    if (mode === 'memory')
        return new MemoryDedupeStore();
    if (!hasFirestoreEnv())
        return new MemoryDedupeStore();
    try {
        const firestore = new firestore_1.Firestore();
        return new FirestoreDedupeStore(firestore, 'kairos_webhook_dedupe');
    }
    catch {
        return new MemoryDedupeStore();
    }
}
