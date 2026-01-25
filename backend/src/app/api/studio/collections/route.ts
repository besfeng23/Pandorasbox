import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import fs from 'fs';
import path from 'path';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * Discover Firestore collections from firestore.rules
 * This auto-discovers all collections defined in the security rules
 */
function discoverCollectionsFromRules(): string[] {
  try {
    const rulesPath = path.join(process.cwd(), 'firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
    
    // Extract collection names from match statements
    const collectionMatches = rulesContent.matchAll(/match\s+\/([^\/\{]+)\/\{/g);
    const collections = new Set<string>();
    
    for (const match of collectionMatches) {
      const collectionName = match[1].trim();
      // Skip system paths like 'databases/{database}/documents'
      if (collectionName && !collectionName.includes('databases') && !collectionName.includes('{')) {
        collections.add(collectionName);
      }
    }
    
    // Also check for subcollections (users/{userId}/threads pattern)
    const subcollectionMatches = rulesContent.matchAll(/match\s+\/[^\/]+\/\{[^}]+\}\/([^\/\{]+)\/\{/g);
    for (const match of subcollectionMatches) {
      const subcollectionName = match[1].trim();
      if (subcollectionName && !subcollectionName.includes('{')) {
        collections.add(subcollectionName);
      }
    }
    
    return Array.from(collections).sort();
  } catch (error) {
    console.error('Error discovering collections from rules:', error);
    // Fallback to known collections
    return [
      'threads',
      'history',
      'memories',
      'artifacts',
      'settings',
      'users',
      'workspaces',
      'analytics',
      'system_knowledge_graph',
      'knowledge_edges',
      'graph_analytics',
      'context_store',
      'rateLimits',
      'external_knowledge',
      'feedback',
      'performance_metrics',
      'meta_learning_state',
      'system_logs',
      'system_phases',
      'system_governance',
      'system_federation',
      'system_selfheal',
      'learning_queue',
    ];
  }
}

/**
 * Get sample document from a collection to infer schema
 */
async function getCollectionSchema(collectionName: string) {
  try {
    const db = getFirestoreAdmin();
    const snapshot = await db.collection(collectionName).limit(1).get();
    
    if (snapshot.empty) {
      return { fields: [], sampleCount: 0 };
    }
    
    const sampleDoc = snapshot.docs[0].data();
    const fields = Object.keys(sampleDoc).map(key => {
      const value = sampleDoc[key];
      let type = 'string';
      
      if (value === null) type = 'null';
      else if (typeof value === 'number') type = Number.isInteger(value) ? 'number' : 'float';
      else if (typeof value === 'boolean') type = 'boolean';
      else if (value instanceof Date || (value && value.toDate)) type = 'timestamp';
      else if (Array.isArray(value)) type = 'array';
      else if (typeof value === 'object') type = 'object';
      else if (typeof value === 'string') {
        // Check if it's a timestamp string
        if (/^\d{4}-\d{2}-\d{2}T/.test(value)) type = 'timestamp';
        else type = 'string';
      }
      
      return {
        name: key,
        type,
        sampleValue: value,
      };
    });
    
    return {
      fields,
      sampleCount: snapshot.size,
    };
  } catch (error) {
    console.error(`Error getting schema for ${collectionName}:`, error);
    return { fields: [], sampleCount: 0, error: (error as Error).message };
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collectionName = searchParams.get('collection');
    
    if (collectionName) {
      // Get schema for specific collection
      const schema = await getCollectionSchema(collectionName);
      return NextResponse.json({ collection: collectionName, ...schema }, { headers: corsHeaders() });
    }
    
    // List all collections
    const collections = discoverCollectionsFromRules();
    
    // Get basic stats for each collection
    const db = getFirestoreAdmin();
    const collectionsWithStats = await Promise.all(
      collections.map(async (name) => {
        try {
          const snapshot = await db.collection(name).limit(1).get();
          return {
            name,
            documentCount: snapshot.size > 0 ? '>0' : '0',
            hasData: snapshot.size > 0,
          };
        } catch (error) {
          return {
            name,
            documentCount: 'error',
            hasData: false,
            error: (error as Error).message,
          };
        }
      })
    );
    
    return NextResponse.json({ collections: collectionsWithStats }, { headers: corsHeaders() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}

