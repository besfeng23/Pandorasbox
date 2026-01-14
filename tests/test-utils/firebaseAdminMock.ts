/**
 * Shared Firebase Admin mocks for Jest tests
 * 
 * Provides consistent mocks for:
 * - firebase-admin (default export with admin.firestore.Timestamp)
 * - firebase-admin/firestore (FieldValue, Timestamp)
 * - @/lib/firebase-admin (getFirestoreAdmin)
 */

// Mock Timestamp object used by both mocks
export const createMockTimestamp = () => ({
  fromDate: jest.fn((date: Date) => ({
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1000000,
  })),
  now: jest.fn(() => ({
    toDate: () => new Date(),
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: (Date.now() % 1000) * 1000000,
  })),
});

// Mock FieldValue
export const createMockFieldValue = () => ({
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  increment: jest.fn((n: number) => ({ _methodName: 'increment', _value: n })),
  delete: jest.fn(() => ({ _methodName: 'delete' })),
  arrayUnion: jest.fn((...elements: any[]) => ({ _methodName: 'arrayUnion', _elements: elements })),
  arrayRemove: jest.fn((...elements: any[]) => ({ _methodName: 'arrayRemove', _elements: elements })),
});

// Create a chainable query mock
export const createMockQuery = (docs: any[] = []) => {
  const query = {
    where: jest.fn(() => query),
    orderBy: jest.fn(() => query),
    limit: jest.fn(() => query),
    startAfter: jest.fn(() => query),
    get: jest.fn(() => Promise.resolve({ 
      docs,
      empty: docs.length === 0,
      size: docs.length,
    })),
  };
  return query;
};

// Create a mock Firestore database
export const createMockFirestore = (options: {
  collections?: Record<string, any[]>;
  batches?: Array<{ commit: jest.Mock }>;
} = {}) => {
  const { collections = {}, batches = [] } = options;
  let batchIndex = 0;

  const createCollection = (collectionName: string) => {
    const docs = collections[collectionName] || [];
    const query = createMockQuery(docs);
    
    return {
      ...query,
      doc: jest.fn((docId?: string) => ({
        id: docId || 'doc-id',
        get: jest.fn(() => Promise.resolve({
          exists: docs.length > 0,
          data: () => docs[0]?.data?.() || null,
          id: docId || 'doc-id',
        })),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
        ref: { id: docId || 'doc-id' },
        collection: jest.fn((subCollection: string) => createCollection(`${collectionName}/${docId}/${subCollection}`)),
      })),
      add: jest.fn(() => Promise.resolve({ id: 'new-doc-id' })),
    };
  };

  const mockBatch = {
    delete: jest.fn(),
    update: jest.fn(),
    set: jest.fn(),
    commit: jest.fn(() => Promise.resolve()),
  };

  return {
    collection: jest.fn((collectionName: string) => createCollection(collectionName)),
    batch: jest.fn(() => {
      if (batches[batchIndex]) {
        return batches[batchIndex++];
      }
      return mockBatch;
    }),
  };
};

