#!/usr/bin/env node

/**
 * Script to add the character profile and guidelines from mh.txt
 * to the memory system for melodee@the-redapple.com
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
config({ path: resolve(process.cwd(), '.env.local') });

import { getAuthAdmin } from '../src/lib/firebase-admin';
import { saveMemory } from '../src/lib/memory-utils';

async function addMelodeeMemory() {
  const userEmail = 'melodee@the-redapple.com';
  const filePath = 'c:\\Users\\Administrator\\Desktop\\mh.txt';
  
  console.log('💾 Adding Character Profile Memory for Melodee...\n');
  console.log(`User Email: ${userEmail}\n`);
  console.log(`Reading file: ${filePath}\n`);

  try {
    // Step 1: Read the file content
    let fileContent: string;
    try {
      fileContent = readFileSync(filePath, 'utf-8');
      console.log(`✅ File read successfully (${fileContent.length} characters)\n`);
    } catch (error: any) {
      console.error(`❌ Error reading file: ${error.message}`);
      process.exit(1);
    }

    // Step 2: Get user ID from email
    const authAdmin = getAuthAdmin();
    let firebaseUser;
    try {
      firebaseUser = await authAdmin.getUserByEmail(userEmail);
      console.log(`✅ User found: ${firebaseUser.uid}\n`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.error(`❌ User with email ${userEmail} not found. Please ensure the user account exists in Firebase.`);
        process.exit(1);
      }
      throw error;
    }

    const userId = firebaseUser.uid;

    // Step 3: Save the memory
    console.log('💾 Saving memory to Firestore...\n');
    
    const result = await saveMemory({
      content: fileContent.trim(),
      userId: userId,
      source: 'character-profile',
      type: 'normal',
      metadata: {
        title: 'Character Profile & Guidelines - Melodee & Joven',
        file_source: 'mh.txt',
        sections: [
          'Memory & Continuity Rules',
          'Melodee Character Profile',
          'Joven Character Profile',
          'Relationship Profile',
          'Memory Tagging Schema',
          'Speech & Tone Guidelines',
          'Communication Style Analysis'
        ]
      }
    });

    if (!result.success) {
      console.error(`❌ Failed to save memory: ${result.message}`);
      process.exit(1);
    }

    console.log('✅ Memory saved successfully!\n');
    console.log(`   Memory ID: ${result.memory_id}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Content length: ${fileContent.trim().length} characters\n`);
    console.log('✅✅✅ MEMORY ADDED SUCCESSFULLY ✅✅✅\n');

  } catch (error: any) {
    console.error('\n❌ Error adding memory:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

addMelodeeMemory();

