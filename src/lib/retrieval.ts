'use server';

import { getFirestoreAdmin } from './firebase-admin'; // Use existing admin instance

export async function runRetrieval(searchQueries: string[]) {
  const adminDb = getFirestoreAdmin();
  console.log("Performing retrieval with queries:", searchQueries);
  // Example: Fetching some data from a 'memories' collection
  const snapshot = await adminDb.collection('memories').limit(10).get();
  const results = snapshot.docs.map(doc => doc.data());
  return results;
}

