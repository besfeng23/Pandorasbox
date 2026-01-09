# API Documentation

## Server Actions

All server actions are located in `src/app/actions.ts` and can be called from client components using Next.js Server Actions.

### Message Management

#### `submitUserMessage(formData: FormData)`

Submit a user message and trigger AI response generation.

**Parameters:**
- `formData` (FormData):
  - `message` (string): The message content
  - `userId` (string): The user ID
  - `threadId` (string, optional): Existing thread ID, creates new thread if omitted
  - `image_data` (string, optional): Base64-encoded image data
  - `source` (string, optional): Message source ('text' | 'voice'), defaults to 'text'

**Returns:**
```typescript
{
  messageId?: string;
  threadId?: string;
  error?: string;
}
```

**Example:**
```typescript
const formData = new FormData();
formData.append('message', 'Hello, how are you?');
formData.append('userId', user.uid);

const result = await submitUserMessage(formData);
if (result.threadId) {
  console.log('Message sent to thread:', result.threadId);
}
```

**Rate Limits:**
- 30 messages per minute per user

**Errors:**
- `Rate limit exceeded` - Too many messages sent
- `User not authenticated` - Missing userId

---

#### `transcribeAndProcessMessage(formData: FormData)`

Transcribe audio and process as a message.

**Parameters:**
- `formData` (FormData):
  - `audio` (File/Blob): Audio file to transcribe
  - `userId` (string): The user ID
  - `threadId` (string, optional): Existing thread ID

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

---

### Thread Management

#### `createThread(userId: string)`

Create a new conversation thread.

**Parameters:**
- `userId` (string): The user ID

**Returns:**
```typescript
Promise<string> // Thread ID
```

---

#### `getUserThreads(userId: string)`

Get all threads for a user.

**Parameters:**
- `userId` (string): The user ID

**Returns:**
```typescript
Promise<Thread[]>
```

**Thread Type:**
```typescript
{
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  summary?: string;
}
```

---

#### `summarizeThread(threadId: string, userId: string)`

Summarize a thread (automatically called for threads with 10+ messages).

**Parameters:**
- `threadId` (string): The thread ID
- `userId` (string): The user ID

**Returns:**
```typescript
Promise<void>
```

---

### Memory Management

#### `searchMemoryAction(query: string, userId: string)`

Search user's memory using vector similarity.

**Parameters:**
- `query` (string): Search query
- `userId` (string): The user ID

**Returns:**
```typescript
Promise<SearchResult[]>
```

**SearchResult Type:**
```typescript
{
  id: string;
  content: string;
  role: string;
  createdAt: Timestamp;
  threadId?: string;
}
```

---

#### `updateMemory(id: string, newText: string, userId: string)`

Update a memory by ID.

**Parameters:**
- `id` (string): Memory ID
- `newText` (string): New content
- `userId` (string): The user ID

**Returns:**
```typescript
Promise<{ success: boolean; message?: string }>
```

---

#### `deleteMemory(userId: string, memoryId?: string)`

Delete a memory or all memories.

**Parameters:**
- `userId` (string): The user ID
- `memoryId` (string, optional): Specific memory ID, deletes all if omitted

**Returns:**
```typescript
Promise<{ success: boolean; message?: string }>
```

---

#### `clearMemory(userId: string)`

Clear all user data (threads, messages, memories, artifacts).

**Parameters:**
- `userId` (string): The user ID

**Returns:**
```typescript
Promise<{ success: boolean; message?: string }>
```

**Warning:** This is a destructive operation and cannot be undone.

---

### Settings

#### `updateSettings(formData: FormData)`

Update user settings.

**Parameters:**
- `formData` (FormData):
  - `userId` (string): The user ID
  - `active_model` (string): Model to use ('gpt-4o' | 'gpt-4-turbo' | 'gpt-3.5-turbo')
  - `reply_style` (string): Reply style ('concise' | 'detailed')
  - `system_prompt_override` (string, optional): Custom system prompt

**Returns:**
```typescript
Promise<{ success: boolean; message?: string }>
```

---

#### `generateUserApiKey(userId: string)`

Generate a personal API key for the user.

**Parameters:**
- `userId` (string): The user ID

**Returns:**
```typescript
Promise<{
  success: boolean;
  apiKey?: string;
  message?: string;
}>
```

---

### Knowledge Management

#### `uploadKnowledge(formData: FormData)`

Upload a knowledge file (PDF or text) and index it.

**Parameters:**
- `formData` (FormData):
  - `file` (File): PDF or text file
  - `userId` (string): The user ID

**Returns:**
```typescript
Promise<{
  success: boolean;
  message: string;
  chunks?: number;
}>
```

**Rate Limits:**
- 10 uploads per hour per user

**Supported Formats:**
- PDF (.pdf)
- Text files (text/plain, text/markdown)

---

### Data Export

#### `exportUserData(userId: string)`

Export all user data for GDPR compliance.

**Parameters:**
- `userId` (string): The user ID

**Returns:**
```typescript
Promise<{
  success: boolean;
  data?: {
    userId: string;
    exportedAt: string;
    threads: Thread[];
    messages: Message[];
    memories: Memory[];
    artifacts: Artifact[];
    settings: Settings | null;
    userState: Record<string, any>;
  };
  message?: string;
}>
```

**Note:** Embeddings are excluded from export for privacy and size reasons.

---

## API Routes

### Scheduled Tasks

#### `POST /api/cron/cleanup`

Scheduled memory cleanup endpoint. Called by Cloud Scheduler daily.

**Authentication:** Optional (can add `CRON_SECRET` header)

**Returns:**
```json
{
  "success": true,
  "deletedThreads": 0,
  "deletedMemories": 0,
  "deletedHistory": 0,
  "message": "Cleanup complete: X threads, Y memories, Z history messages deleted."
}
```

**Schedule:** Daily at 2:00 AM UTC

---

#### `POST /api/cron/daily-briefing`

Generate daily briefings for all users. Called by Cloud Scheduler daily.

**Authentication:** Optional (can add `CRON_SECRET` header)

**Returns:**
```json
{
  "success": true,
  "processed": 5,
  "errors": 0,
  "message": "Daily briefing complete. Processed 5 users, 0 errors."
}
```

**Schedule:** Daily at 1:00 PM UTC (8:00 AM EST)

---

## Rate Limiting

Rate limits are enforced using a token bucket algorithm:

- **Messages:** 30 per minute
- **Uploads:** 10 per hour
- **Embeddings:** 100 per hour

When rate limit is exceeded, the action returns an error with a message indicating when to retry.

---

## Error Handling

All server actions return structured error responses:

```typescript
{
  success: false;
  message: string; // Human-readable error message
}
```

Errors are automatically logged to:
- Console (development)
- Sentry (production, if configured)

---

## Authentication

All server actions require a valid `userId`. The application uses Firebase Authentication, and the userId should be the Firebase Auth UID.

Client-side authentication is handled by Firebase Auth, and the userId is extracted from the authenticated user object.

---

## Data Models

### Message
```typescript
{
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  userId: string;
  threadId: string;
  createdAt: Timestamp;
  imageUrl?: string;
  source?: 'text' | 'voice';
  embedding?: number[];
  status?: 'processing' | 'complete' | 'error';
  progress_log?: string[];
}
```

### Thread
```typescript
{
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  summary?: string;
}
```

### Memory
```typescript
{
  id: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
  embedding: number[];
}
```

### Artifact
```typescript
{
  id: string;
  userId: string;
  title: string;
  type: 'code' | 'markdown';
  content: string;
  version: number;
  createdAt: Timestamp;
}
```

---

## Best Practices

1. **Always handle errors:** Check `success` field in responses
2. **Respect rate limits:** Implement retry logic with exponential backoff
3. **Validate input:** Ensure required fields are present before calling actions
4. **Use TypeScript:** Leverage type definitions for better error checking
5. **Monitor usage:** Track API calls to stay within rate limits

---

## Support

For issues or questions:
1. Check error messages for guidance
2. Review Firebase Console logs
3. Check Sentry for error tracking (if configured)
4. Review this documentation

