#!/usr/bin/env tsx
/**
 * Tavily Search CLI Test Script
 * 
 * Usage:
 *   tsx scripts/test-tavily-search.ts "your search query here"
 * 
 * Requires TAVILY_API_KEY environment variable
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { tavilySearch } from '../src/lib/tavily';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const query = process.argv[2];
  
  if (!query) {
    console.error('Usage: tsx scripts/test-tavily-search.ts "your search query"');
    process.exit(1);
  }

  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    console.error('❌ Error: TAVILY_API_KEY environment variable is required');
    console.error('   Set it in .env.local or export it in your shell');
    process.exit(1);
  }

  console.log(`🔍 Searching Tavily for: "${query}"\n`);

  try {
    const results = await tavilySearch(query, { maxResults: 5 });
    
    console.log(`✅ Found ${results.length} results:\n`);
    
    results.results.forEach((result, index) => {
      console.log(`--- Result ${index + 1} ---`);
      console.log(`Title: ${result.title}`);
      console.log(`URL: ${result.url}`);
      console.log(`Snippet: ${result.snippet.substring(0, 200)}...`);
      console.log('');
    });
    
    console.log(`\n✅ Search completed successfully!`);
  } catch (error: any) {
    console.error('❌ Search failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();

