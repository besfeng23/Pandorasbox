# Verify Melodee Memory Storage

This guide shows you how to verify if the memory about "Melodee's voice and realism instructions" was correctly stored and indexed.

## Method 1: Using the ChatGPT API Endpoint (Recommended)

### Using cURL

```bash
curl -X POST "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/retrieve-memories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CHATGPT_API_KEY" \
  -d '{
    "query": "Melodee character voice and realism instructions",
    "user_email": "joven.ong23@gmail.com",
    "limit": 20
  }'
```

### Using PowerShell

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_CHATGPT_API_KEY"
}

$body = @{
    query = "Melodee character voice and realism instructions"
    user_email = "joven.ong23@gmail.com"
    limit = 20
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/retrieve-memories" `
  -Method POST `
  -Headers $headers `
  -Body $body
```

### Expected Response

If the memory exists, you should see:

```json
{
  "success": true,
  "count": 1,
  "memories": [
    {
      "id": "memory_id_here",
      "content": "Memory content about Melodee...",
      "relevance_score": 0.85,
      "timestamp": "2025-01-XX..."
    }
  ],
  "user_id": "firebase_user_id"
}
```

## Method 2: Using the MCP API Endpoint

### Using cURL

```bash
curl -X POST "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/mcp/search_knowledge_base" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -d '{
    "query": "Melodee character voice and realism instructions",
    "user_email": "joven.ong23@gmail.com",
    "limit": 20
  }'
```

## Method 3: Using the Memory Inspector UI

1. Log into your Pandora's Box application
2. Navigate to **Settings** → **Memory** tab
3. In the search box, type: `Melodee voice realism`
4. Check if memories appear related to:
   - Character voice instructions
   - Realism guidelines
   - Dialogue modeling
   - Emotional variability
   - Tone evolution

## Method 4: Search with Related Keywords

Try these search queries to find related memories:

### Queries to Try:

1. **"Melodee voice instructions"**
2. **"character realism dialogue modeling"**
3. **"emotional variability tone evolution"**
4. **"chat history reference dialogue"**
5. **"avoid flat robotic tone"**

### Multiple Search Command (PowerShell)

```powershell
$apiKey = "YOUR_CHATGPT_API_KEY"
$userEmail = "joven.ong23@gmail.com"
$baseUrl = "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/retrieve-memories"

$queries = @(
    "Melodee character voice and realism instructions",
    "Melodee voice instructions",
    "character realism dialogue modeling",
    "emotional variability tone evolution",
    "chat history reference dialogue"
)

foreach ($query in $queries) {
    Write-Host "`nSearching for: $query" -ForegroundColor Cyan
    
    $body = @{
        query = $query
        user_email = $userEmail
        limit = 10
    } | ConvertTo-Json
    
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $apiKey"
    }
    
    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $body
        if ($response.success -and $response.count -gt 0) {
            Write-Host "✓ Found $($response.count) memory/memories" -ForegroundColor Green
            foreach ($memory in $response.memories) {
                Write-Host "  - Score: $($memory.relevance_score), Content: $($memory.content.Substring(0, [Math]::Min(100, $memory.content.Length)))..." -ForegroundColor Yellow
            }
        } else {
            Write-Host "✗ No memories found" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 1
}
```

## Verification Checklist

When verifying the memory, check for these key concepts:

- [ ] **Source Chat Reference**: Mentions using real chat history
- [ ] **Dialogue Modeling**: Instructions about dialogue style
- [ ] **Emotional Variability**: Guidelines for emotional expression
- [ ] **Tone Evolution**: Instructions about tone changes
- [ ] **Realism Instructions**: Guidelines for realistic responses
- [ ] **Avoid Flat/Robotic Tone**: Specific instructions about avoiding robotic responses

## What to Do If Memory Not Found

1. **Check if memory was created**: The memory might not have been stored if:
   - The conversation didn't trigger memory creation
   - The message didn't contain key information the AI recognized as important
   - Vector search index is still building (can take a few minutes)

2. **Manually store the memory**: Use the store-memory API endpoint:

```bash
curl -X POST "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/store-memory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CHATGPT_API_KEY" \
  -d '{
    "memory": "Melodee character: Use real chat history as source. Implement dialogue modeling with emotional variability. Tone should evolve naturally. Avoid flat or robotic responses. Reference chat history for realistic dialogue patterns.",
    "user_email": "joven.ong23@gmail.com"
  }'
```

3. **Check Firestore directly**: 
   - Go to Firebase Console
   - Navigate to Firestore Database
   - Check the `memories` collection
   - Filter by your user ID
   - Search for documents containing "Melodee" or related terms

## Notes

- Memories are stored with semantic embeddings, so exact text matches aren't required
- The search uses vector similarity, so related concepts will be found even with different wording
- Memory creation happens automatically during conversations, but can also be done manually via API
- Vector search index may take a few minutes to update after memory creation

