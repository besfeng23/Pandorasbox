# Memory System End-to-End Test Checklist

## ✅ Issues Fixed

1. **Memory Creation Prompt** - Fixed to explicitly require 3-10 search queries
2. **MemoryTable Collection** - Fixed to query `memories` instead of `history`
3. **Firestore Index** - Added and deployed index for `userId + createdAt`
4. **Timestamp** - Fixed to use `FieldValue.serverTimestamp()`
5. **Debug Logging** - Added console logs for user ID and memory queries

## 🧪 Test Steps

### 1. Verify Firestore Index
- ✅ Index deployed successfully
- ⏳ Wait 2-5 minutes for index to build
- Check Firebase Console → Firestore → Indexes
- Status should be "Enabled"

### 2. Test Memory Creation via Chat
1. Open the app in browser
2. Open browser console (F12)
3. Send a test message with specific details:
   - Example: "My name is John Doe, I'm a software engineer, and I prefer dark mode interfaces"
4. Check server logs for:
   - `[MemoryLane] Extracted X search queries`
   - `[MemoryLane] Successfully created X memories`
5. Wait a few seconds for indexing

### 3. Verify in Firestore Console
1. Go to Firebase Console → Firestore Database
2. Navigate to `memories` collection
3. Filter by your `userId` (check browser console for `[PandorasBox] Current User ID`)
4. Verify documents exist with:
   - `userId`: matches your user ID
   - `content`: search query text
   - `createdAt`: timestamp
   - `embedding`: array of numbers

### 4. Test MemoryTable Display
1. Go to Settings page → Memory tab
2. Check browser console for:
   - `[MemoryTable] Setting up listener for userId: <uid>`
   - `[MemoryTable] Received X memories for userId: <uid>`
3. Verify memories appear in the table
4. Test search functionality
5. Test edit/delete functionality

### 5. Test Memory Retrieval API
Run the test script:
```powershell
.\scripts\test-memory-e2e.ps1
```

Or manually:
```powershell
$headers = @{ "Authorization" = "Bearer $env:CHATGPT_API_KEY" ; "Content-Type" = "application/json" }
$body = @{ query = "test" ; user_email = "joven.ong23@gmail.com" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/retrieve-memories" -Method POST -Headers $headers -Body $body
```

### 6. Test Memory Inspector (Sidebar)
1. Open the right sidebar
2. Switch to "Memories" tab
3. Verify memories appear
4. Test search and filters

## 🐛 Troubleshooting

### Memories not showing in Settings
- Check browser console for `[MemoryTable]` logs
- Verify user ID matches in Firestore
- Check if index is built (wait 2-5 minutes)
- Verify index status in Firebase Console

### No memories created
- Check server logs for `[MemoryLane]` messages
- Verify `search_queries` array is not empty
- Check if OpenAI API is working
- Verify message was sent successfully

### Index errors
- Wait for index to build (2-5 minutes)
- Check Firebase Console → Firestore → Indexes
- Verify index status is "Enabled"
- Re-deploy if needed: `firebase deploy --only firestore:indexes`

### User ID mismatch
- Check browser console: `[PandorasBox] Current User ID`
- Verify memories in Firestore have matching `userId`
- Check if user is authenticated

## 📊 Expected Results

After sending a test message:
- Server logs show: `[MemoryLane] Extracted 3-10 search queries`
- Server logs show: `[MemoryLane] Successfully created X memories`
- Firestore `memories` collection has new documents
- Settings Memory table shows the memories
- Memory Inspector shows the memories
- API retrieval returns the memories

## ⚠️ Important Notes

- **Past messages won't have memories** - Only NEW messages after the fix will create memories
- **Index takes time** - Wait 2-5 minutes after deployment
- **User ID must match** - Memories are scoped to the authenticated user
- **Test with new messages** - Send fresh messages to test the system

