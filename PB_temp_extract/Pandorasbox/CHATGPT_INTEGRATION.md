# ChatGPT Integration Guide

This guide explains how to connect Pandora's Box to ChatGPT as a Custom GPT Action for storing and retrieving memories.

## Overview

Pandora's Box provides API endpoints that ChatGPT can call to:
- **Store memories**: Save important information about the user
- **Retrieve memories**: Search and recall stored information using semantic search

All memories are stored in the Firebase account associated with `joven.ong23@gmail.com`.

## Prerequisites

1. **Firebase User Account**: Ensure the user `joven.ong23@gmail.com` exists in Firebase Authentication
2. **API Key**: Generate a secure API key for ChatGPT authentication
3. **ChatGPT Plus/Enterprise**: Required for Custom GPTs with Actions

## Step 1: Generate API Key

1. Go to your Firebase App Hosting environment variables
2. Add a new secret: `CHATGPT_API_KEY`
3. Generate a secure random string (e.g., using `openssl rand -hex 32`)
4. Store it in Cloud Secret Manager

Or set it in your `.env.local` for testing:
```bash
CHATGPT_API_KEY=your_secure_random_key_here
```

## Step 2: Configure in ChatGPT

### Option A: Using OpenAPI Schema (Recommended)

1. **Create a Custom GPT**:
   - Go to ChatGPT → Explore GPTs → Create
   - Name it "Pandora's Box Memory"

2. **Add Action**:
   - Click "Add Action" in the GPT configuration
   - Choose "Import from URL"
   - Enter: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/openapi.yaml`
   - Or paste the OpenAPI schema from `src/app/api/chatgpt/openapi.yaml`

3. **Configure Authentication**:
   - Select "API Key"
   - Choose "Header" location
   - Header name: `Authorization`
   - API Key: Your `CHATGPT_API_KEY` value
   - Format: `Bearer YOUR_API_KEY`

4. **Add Instructions**:
   ```
   You are a memory assistant connected to Pandora's Box. 
   When the user shares important information, use the store_memory action to save it.
   When you need to recall information, use the retrieve_memories action with a relevant search query.
   Always store memories in a clear, concise format that will be useful for future conversations.
   ```

### Option B: Manual Configuration

1. **Store Memory Endpoint**:
   - URL: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/store-memory`
   - Method: POST
   - Headers:
     - `Authorization: Bearer YOUR_API_KEY`
     - `Content-Type: application/json`
   - Body:
     ```json
     {
       "memory": "The user prefers dark mode interfaces",
       "user_email": "joven.ong23@gmail.com"
     }
     ```

2. **Retrieve Memories Endpoint**:
   - URL: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/retrieve-memories`
   - Method: GET or POST
   - Headers:
     - `Authorization: Bearer YOUR_API_KEY`
   - Query Parameters (GET) or Body (POST):
     ```json
     {
       "query": "user preferences",
       "user_email": "joven.ong23@gmail.com",
       "limit": 10
     }
     ```

## Step 3: Test the Integration

### Test Store Memory

```bash
curl -X POST https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/store-memory \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "memory": "User prefers TypeScript over JavaScript",
    "user_email": "joven.ong23@gmail.com"
  }'
```

### Test Retrieve Memories

```bash
curl -X GET "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/retrieve-memories?query=programming%20preferences&user_email=joven.ong23@gmail.com" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## API Endpoints

### POST `/api/chatgpt/store-memory`

Stores a memory in the system.

**Request:**
```json
{
  "memory": "The user prefers dark mode interfaces",
  "user_email": "joven.ong23@gmail.com"  // Optional, defaults to joven.ong23@gmail.com
}
```

**Response:**
```json
{
  "success": true,
  "message": "Memory stored successfully",
  "memory_id": "abc123",
  "user_id": "firebase_user_id"
}
```

### GET `/api/chatgpt/retrieve-memories`

Retrieves memories using semantic search or returns recent memories.

**Query Parameters:**
- `query` (optional): Search query for semantic retrieval
- `user_email` (optional): User email, defaults to joven.ong23@gmail.com
- `limit` (optional): Max results (1-50, default: 10)

**Response:**
```json
{
  "success": true,
  "count": 3,
  "memories": [
    {
      "id": "abc123",
      "content": "User prefers dark mode interfaces",
      "relevance_score": 0.95,
      "timestamp": "2025-01-05T12:00:00Z"
    }
  ],
  "user_id": "firebase_user_id"
}
```

### POST `/api/chatgpt/retrieve-memories`

Alternative POST endpoint with same functionality.

**Request:**
```json
{
  "query": "user preferences",
  "user_email": "joven.ong23@gmail.com",
  "limit": 10
}
```

## How It Works

1. **Memory Storage**:
   - ChatGPT calls `store-memory` when user shares important information
   - Memory is converted to a vector embedding using OpenAI's embedding model
   - Stored in Firestore `memories` collection with the user's ID

2. **Memory Retrieval**:
   - ChatGPT calls `retrieve-memories` with a search query
   - System performs semantic search using vector similarity
   - Returns most relevant memories based on the query

3. **User Mapping**:
   - All memories are associated with the Firebase user account for `joven.ong23@gmail.com`
   - The system automatically looks up the user by email and uses their Firebase UID

## Security

- **API Key Authentication**: All requests require a valid API key
- **User Isolation**: Memories are scoped to the specific user account
- **Rate Limiting**: Consider adding rate limiting for production use

## Troubleshooting

### "User not found" Error
- Ensure `joven.ong23@gmail.com` exists in Firebase Authentication
- Verify the email is correctly spelled

### "Unauthorized" Error
- Check that `CHATGPT_API_KEY` is set in environment variables
- Verify the Authorization header format: `Bearer YOUR_API_KEY`
- Ensure the API key matches exactly (no extra spaces)

### Memories Not Appearing
- Check Firestore console for the `memories` collection
- Verify the user_id matches the Firebase user
- Check that embeddings are being generated (may take a moment)

## Example Usage in ChatGPT

**User**: "I prefer dark mode interfaces"

**ChatGPT** (automatically):
- Calls `store-memory` with: `{"memory": "User prefers dark mode interfaces"}`
- Confirms: "I've saved that preference to your memory."

**Later, User**: "What are my preferences?"

**ChatGPT** (automatically):
- Calls `retrieve-memories` with: `{"query": "user preferences"}`
- Responds: "Based on your saved memories, you prefer dark mode interfaces..."

## Next Steps

1. Set up the API key in your environment
2. Create the Custom GPT in ChatGPT
3. Test with a few memories
4. Monitor the Firestore console to see memories being stored
5. Enjoy persistent memory across ChatGPT conversations!

