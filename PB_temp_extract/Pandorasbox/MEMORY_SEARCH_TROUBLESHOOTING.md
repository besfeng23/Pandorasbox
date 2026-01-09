# Memory Search Troubleshooting Guide

## Issue: Memories Saved But Not Appearing in Search Results

### ✅ Improvements Made

1. **Enhanced Error Handling**
   - Added detailed logging to see what's happening
   - Better error messages with error codes
   - Logs when vector search fails vs returns empty

2. **Fallback Mechanisms**
   - Text-based search fallback when vector search fails
   - Direct memory query fallback
   - Multiple fallback layers to ensure results

3. **Debug Script**
   - Created `scripts/debug-memory-search.ts` to diagnose issues
   - Checks memory structure, embeddings, and search functionality

### 🔍 Common Causes

#### 1. Firestore Vector Indexes Not Deployed

**Symptom**: Vector search fails with index-related errors

**Solution**:
```bash
# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

**Verify in Firebase Console**:
1. Go to Firebase Console → Firestore Database → Indexes
2. Check for indexes on `memories` collection with `embedding` field
3. Ensure status is "Enabled" (not "Building" or "Error")

#### 2. Index Still Building

**Symptom**: Indexes show "Building" status

**Solution**: Wait for indexes to finish building (can take 5-30 minutes)

#### 3. Embeddings Not Generated

**Symptom**: Memories exist but have no `embedding` field

**Solution**: Run reindex script
```bash
# Use the reindex button in Settings page
# Or call reindexMemories function
```

#### 4. User ID Mismatch

**Symptom**: Memories exist but search returns empty

**Solution**: Verify user ID matches
- Check `userId` field in memory documents
- Ensure search uses correct user ID

### 🧪 Diagnostic Steps

#### Step 1: Run Debug Script

```bash
npx tsx scripts/debug-memory-search.ts
```

This will show:
- Total memories for user
- Memory structure (fields present)
- Embedding validity
- Vector search results
- Recent memories

#### Step 2: Check Firestore Console

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Open `memories` collection
4. Filter by your user ID
5. Check a memory document:
   - ✅ Has `embedding` field (array of 1536 numbers)
   - ✅ Has `content` field
   - ✅ Has `userId` field
   - ✅ Has `source` field

#### Step 3: Check Indexes

1. Go to Firestore → Indexes tab
2. Look for indexes on `memories` collection
3. Should see:
   - Index with `userId` + `createdAt`
   - Index with `embedding` (vector)
   - Index with `userId` + `embedding` (vector)

#### Step 4: Test Search Directly

```typescript
import { searchMemories } from '@/lib/vector';

const results = await searchMemories('your query', userId, 10);
console.log('Results:', results);
```

### 🔧 Fixes Applied

#### Enhanced `searchMemories()` Function

- ✅ Better error logging
- ✅ Fallback text search when vector search fails
- ✅ Returns results even if vector search unavailable

#### Enhanced `searchKnowledgeBase()` Function

- ✅ Better error handling
- ✅ Multiple fallback layers
- ✅ Direct memory query fallback
- ✅ Detailed logging

### 📊 What to Check

1. **Memory Documents**
   - ✅ Exist in Firestore
   - ✅ Have `embedding` field
   - ✅ Embedding is 1536 dimensions
   - ✅ Embedding has non-zero values
   - ✅ `userId` matches search user

2. **Firestore Indexes**
   - ✅ Vector indexes deployed
   - ✅ Indexes enabled (not building)
   - ✅ No index errors

3. **Search Function**
   - ✅ Uses correct user ID
   - ✅ Generates query embedding
   - ✅ Vector search executes
   - ✅ Fallback works if needed

### 🚀 Quick Fixes

#### If Vector Search Fails

The code now automatically falls back to:
1. Text-based search (matches query words)
2. Direct memory query (returns recent memories)
3. History search (as last resort)

#### If Indexes Not Deployed

```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Wait for deployment (check Firebase Console)
# Then test search again
```

#### If Embeddings Missing

1. Go to Settings page
2. Click "Reindex Memories" button
3. Wait for completion
4. Test search again

### 📝 Logging

The enhanced code now logs:
- `[searchMemories]` - Memory search operations
- `[searchKnowledgeBase]` - Knowledge base search operations
- Error details with codes
- Fallback attempts
- Result counts

Check server logs to see what's happening during search.

### ✅ Expected Behavior

**With Working Vector Search**:
- Returns semantically similar memories
- Results sorted by relevance (score)
- Fast response

**With Fallback Text Search**:
- Returns memories matching query words
- Results sorted by match count
- Still functional, just less semantic

**With Direct Query Fallback**:
- Returns recent memories
- No semantic matching
- Ensures something is returned

---

**Status**: Enhanced with better error handling and fallback mechanisms. Search should now work even if vector indexes aren't ready.

