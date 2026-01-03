# Things Left to Add to Pandora's Box

Based on the codebase analysis and technical documentation, here are the items that need to be implemented or improved:

## 🔴 Critical Security & Infrastructure

### 1. **Firestore Security Rules** (HIGH PRIORITY)
**Status**: Missing for critical collections
- **Missing Rules For**:
  - `history` collection
  - `threads` collection  
  - `memories` collection
  - `artifacts` collection
- **Current State**: Only `settings` and `users/{userId}/*` have rules
- **Risk**: Collections are currently accessed server-side only, but should have client-side rules as a defense-in-depth measure
- **Location**: `firestore.rules`
- **Action**: Add rules to restrict access to user-owned data only

### 2. **Rate Limiting**
**Status**: Not implemented
- **Missing**: Rate limiting on API calls, embeddings, and message submissions
- **Impact**: Vulnerable to abuse, potential cost overruns
- **Suggested Solutions**:
  - Implement per-user rate limits using Firebase Functions or middleware
  - Limit embeddings per minute/hour
  - Limit message submissions per user

### 3. **Error Monitoring & Logging**
**Status**: Basic console logging only
- **Missing**: Proper error tracking (e.g., Sentry, LogRocket)
- **Missing**: Structured logging for production
- **Missing**: Performance monitoring

## 🟡 Important Features

### 4. **MEMORY_API_KEY Implementation**
**Status**: Placeholder in `.env.local`, not used anywhere
- **Current**: `MEMORY_API_KEY=your_secret_api_key_here` (placeholder)
- **Action**: Either implement the memory API integration or remove the placeholder

### 5. **User Data Export/Import**
**Status**: Not implemented
- **Missing**: Export user data functionality (GDPR/compliance)
- **Missing**: Import/backup functionality
- **Location**: Should be in settings page or separate export endpoint

### 6. **Memory Cleanup Automation**
**Status**: Manual only (`clearMemory` function exists)
- **Missing**: Automatic cleanup of old threads/memories
- **Missing**: Configurable retention policies
- **Missing**: Soft delete with recovery option
- **Suggested**: Scheduled Cloud Function to archive/delete old data

### 7. **Cost Optimization - Embedding Batching**
**Status**: All messages embedded immediately
- **Current**: Every message triggers immediate embedding generation
- **Optimization**: Batch embeddings for better cost efficiency
- **Impact**: Could reduce OpenAI API costs significantly

### 8. **Vector Index Management**
**Status**: Manual/automatic via Firestore
- **Missing**: Monitoring/index health checks
- **Missing**: Index rebuild/reindex utilities
- **Note**: Firestore handles this automatically, but monitoring would be helpful

## 🟢 Feature Enhancements

### 9. **Enhanced Image Memory**
**Status**: Basic image support exists
- **Current**: Images stored, basic descriptions generated
- **Missing**: Vision embeddings for image search
- **Missing**: Image-to-image similarity search
- **Enhancement**: Store CLIP or vision model embeddings for semantic image search

### 10. **Memory Compression**
**Status**: Not implemented
- **Missing**: Automatic summarization and compression of old memories
- **Benefit**: Reduce storage costs, improve retrieval speed
- **Suggested**: Periodically summarize old threads/memories into compressed versions

### 11. **Analytics & Metrics**
**Status**: Not implemented
- **Missing**: Usage analytics (messages per user, embeddings generated, etc.)
- **Missing**: Memory effectiveness metrics (retrieval quality, relevance scores)
- **Missing**: Cost tracking per user
- **Suggested**: Firebase Analytics integration or custom analytics

### 12. **Collaboration Features**
**Status**: Not implemented
- **Missing**: Shared threads between users
- **Missing**: Shared knowledge bases
- **Missing**: Team/organization support
- **Future**: Would require significant architecture changes

### 13. **Plugin System**
**Status**: Not implemented
- **Missing**: Extensible plugin architecture
- **Missing**: Custom flow definitions
- **Missing**: Third-party integrations
- **Future**: Major architectural enhancement

## 🔵 Nice-to-Have Improvements

### 14. **Testing Infrastructure**
**Status**: Not visible in codebase
- **Missing**: Unit tests
- **Missing**: Integration tests
- **Missing**: E2E tests
- **Suggested**: Jest, Playwright, or similar

### 15. **Documentation**
**Status**: Architecture docs exist, but...
- **Missing**: API documentation (OpenAPI/Swagger)
- **Missing**: Developer onboarding guide
- **Missing**: Deployment runbook
- **Missing**: Contributing guidelines

### 16. **Performance Optimizations**
**Status**: Basic optimizations only
- **Missing**: Caching layer for embeddings (Redis/Memorystore)
- **Missing**: Request deduplication
- **Missing**: Streaming responses for long AI generations
- **Missing**: Image optimization/compression

### 17. **UI/UX Enhancements**
**Status**: Functional but could be improved
- **Missing**: Dark/light mode toggle (currently dark only)
- **Missing**: Keyboard shortcuts documentation
- **Missing**: Accessibility improvements (ARIA labels, screen reader support)
- **Missing**: Mobile responsiveness improvements

### 18. **Storage Rules**
**Status**: Basic rules exist
- **Current**: `storage.rules` file exists but needs review
- **Action**: Verify Firebase Storage rules are properly configured
- **Missing**: File size limits enforcement
- **Missing**: File type restrictions

### 19. **Multi-language Support**
**Status**: Not implemented
- **Missing**: Internationalization (i18n)
- **Missing**: Multi-language UI
- **Missing**: Language detection for messages

### 20. **Notification System**
**Status**: Not implemented
- **Missing**: Browser notifications
- **Missing**: Email notifications for long-running tasks
- **Missing**: Real-time notifications for shared threads

## 📋 Recommended Priority Order

### Phase 1 (Critical - Do First):
1. Firestore Security Rules (#1)
2. Rate Limiting (#2)
3. Error Monitoring (#3)

### Phase 2 (Important - Do Soon):
4. Memory Cleanup Automation (#6)
5. Cost Optimization - Embedding Batching (#7)
6. MEMORY_API_KEY cleanup (#4)

### Phase 3 (Enhancements - Do Later):
7. User Data Export/Import (#5)
8. Enhanced Image Memory (#9)
9. Analytics & Metrics (#11)
10. Memory Compression (#10)

### Phase 4 (Future Features):
11. Collaboration Features (#12)
12. Plugin System (#13)
13. Multi-language Support (#19)

---

**Last Updated**: January 2025
**Status**: Active Development

