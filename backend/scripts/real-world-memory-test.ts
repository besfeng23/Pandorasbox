#!/usr/bin/env node

/**
 * STANDALONE REAL-WORLD MEMORY TEST
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

// 1. Load Environment
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
    config({ path: envPath });
}

// 2. Configuration
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const EMBEDDINGS_URL = process.env.EMBEDDINGS_BASE_URL || 'http://localhost:8080';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'joven.ong23@gmail.com';
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'seismic-vista-480710-q5';

// 3. Initialize Firebase Admin
if (admin.apps.length === 0) {
    process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;
    admin.initializeApp({
        projectId: PROJECT_ID
    });
}

async function embedText(text: string): Promise<number[]> {
    const url = `${EMBEDDINGS_URL.replace(/\/$/, '')}/v1/embeddings`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text.trim() }),
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Embedding failed (${response.status}): ${err}`);
    }
    const data = await response.json();
    return data.data?.[0]?.embedding || data.embedding || [];
}

async function runTest() {
    const secretCode = "998877";
    const memoryText = `The secret code for the audit is ${secretCode}.`;

    console.log('🚀 STANDALONE MEMORY TEST STARTING...');
    console.log(`📍 Project: ${PROJECT_ID}`);
    console.log(`📍 Qdrant: ${QDRANT_URL}`);
    console.log(`📍 Embeddings: ${EMBEDDINGS_URL}\n`);

    try {
        // A. Resolve User
        console.log(`🔍 Resolving user: ${TEST_USER_EMAIL}...`);
        const user = await admin.auth().getUserByEmail(TEST_USER_EMAIL);
        const userId = user.uid;
        console.log(`✅ User ID: ${userId}\n`);

        // B. Generate Embedding
        console.log(`🧠 Generating embedding for memory...`);
        const vector = await embedText(memoryText);
        console.log(`✅ Embedding size: ${vector.length}\n`);

        // C. Upsert to Qdrant
        const pointId = uuidv4();
        console.log(`📥 Storing memory in Qdrant (Point: ${pointId})...`);
        const upsertRes = await fetch(`${QDRANT_URL}/collections/memories/points?wait=true`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                points: [{
                    id: pointId,
                    vector,
                    payload: {
                        content: memoryText,
                        userId,
                        agentId: 'universe',
                        type: 'fact',
                        createdAt: new Date().toISOString()
                    }
                }]
            })
        });
        if (!upsertRes.ok) throw new Error(`Qdrant upsert failed: ${upsertRes.statusText}`);
        console.log(`✅ Upsert Success.\n`);

        // D. Search Memory
        const query = "What was that secret code from the audit?";
        console.log(`🔍 Querying: "${query}"...`);
        const queryVector = await embedText(query);
        const searchRes = await fetch(`${QDRANT_URL}/collections/memories/points/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vector: queryVector,
                limit: 3,
                with_payload: true,
                filter: {
                    must: [
                        { key: 'userId', match: { value: userId } },
                        { key: 'agentId', match: { value: 'universe' } }
                    ]
                }
            })
        });

        if (!searchRes.ok) throw new Error(`Qdrant search failed: ${searchRes.statusText}`);
        const searchData = await searchRes.json();
        const results = searchData.result || [];

        console.log(`\n📊 Search Results:`);
        let found = false;
        results.forEach((res: any, i: number) => {
            console.log(`  [${i + 1}] Score: ${res.score.toFixed(4)} | Text: "${res.payload?.content}"`);
            if (res.payload?.content?.includes(secretCode)) found = true;
        });

        if (found) {
            console.log(`\n🎉 SUCCESS: The secret code "${secretCode}" was correctly retrieved!`);
            console.log(`✅ Vector Search, Embeddings, and Memory layers are communicating perfectly.`);
        } else {
            console.error(`\n❌ FAILURE: Could not retrieve the secret code in search results.`);
            process.exit(1);
        }

    } catch (error: any) {
        console.error(`\n❌ TEST FATAL: ${error.message}`);
        process.exit(1);
    }
}

runTest();
