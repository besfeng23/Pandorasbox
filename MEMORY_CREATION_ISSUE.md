# Memory Creation Issue Analysis

## Problem
Memories are not being automatically created/indexed.

## Root Cause
The memory creation depends on the AI model (GPT) generating `search_queries` in the JSON response from `runMemoryLane`. The current system prompt is too vague and doesn't explicitly instruct the AI to generate search queries.

**Current System Prompt (line 72):**
```
You are a memory manager. Read the current context note and the new user message. Return a JSON object containing: "new_context_note" (string) and "search_queries" (array of strings).
```

**Issue**: This prompt doesn't:
- Explain WHEN to create search queries
- Explain WHAT makes a good search query
- Encourage the AI to extract key information
- Give examples of good search queries

## Code Flow
1. `submitUserMessage` → calls `runChatLane`
2. `runChatLane` → calls `runMemoryLane` (line 46)
3. `runMemoryLane` → asks GPT to generate search_queries (line 80-87)
4. Only if `searchQueries.length > 0` → memories are created (line 97)

## Solution
Improve the system prompt to be more explicit about:
1. **When** to create search queries (always extract key information)
2. **What** to include (keywords, facts, preferences, instructions)
3. **How many** to generate (3-10 per message)
4. **Format** (concise, searchable phrases)

