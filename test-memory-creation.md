# End-to-End Memory Creation Test Plan

## Flow to Verify:

1. **Memory Creation Flow:**
   - User sends message → `submitUserMessage` → `runChatLane` → `runMemoryLane`
   - `runMemoryLane` should:
     - Generate search queries from AI
     - Create documents in `memories` collection
     - Each memory should have: `id`, `content`, `embedding`, `createdAt`, `userId`

2. **Memory Display Flow:**
   - Settings page → `MemoryTable` component
   - `MemoryTable` uses `onSnapshot` listener on `memories` collection
   - Query: `where('userId', '==', userId).orderBy('createdAt', 'desc')`

## Potential Issues to Check:

1. **Firestore Index**: The query requires a composite index for `userId` + `createdAt`
2. **Error Handling**: Check if errors are being silently swallowed
3. **Batch Commit**: Verify batch.commit() is actually executing
4. **Real-time Listener**: Verify onSnapshot is set up correctly

## Test Steps:

1. Send a test message with meaningful content
2. Check Firestore console for documents in `memories` collection
3. Check Settings page Memory table for displayed memories
4. Verify memory structure matches expected schema

