# Chat Refactor Plan

## Phase 1 cleanup note

### Canonical chat files

- `backend/src/app/chat/page.tsx` renders `ChatContainer` for new chat sessions.
- `backend/src/app/chat/[id]/page.tsx` renders `ChatContainer` with `initialConversationId` for existing conversations.
- `backend/src/components/chat/ChatContainer.tsx` is the canonical chat orchestrator for chat route state, message loading, streaming responses, and routing newly created conversations.
- `backend/src/components/chat/ChatInput.tsx` and `backend/src/components/chat/MessageList.tsx` are the active child components used by `ChatContainer`.

### Duplicate/stale chat files

Do not delete these in Phase 1; keep them available for later comparison and feature porting.

- `backend/src/components/chat/ChatWindow.tsx`
- `backend/src/components/chat/chat-panel.tsx`
- `backend/src/components/chat/chat-input.tsx`
- `backend/src/components/chat/chat-sidebar.tsx`
- `backend/src/hooks/use-chat-history.ts`

### Useful features to port later

- Tool/thinking progress indicators and streaming tool activity from `ChatWindow`.
- Thread/history sidebar behavior from `chat-sidebar` and `use-chat-history`.
- Any attachment, canvas, or artifact affordances not already covered by `ChatContainer`.
- Error, abort, and retry UX improvements from older components, if still relevant.

### Recommended next phases

1. Inventory duplicate component behavior against `ChatContainer` and create a feature parity checklist.
2. Port one missing user-visible feature at a time into `ChatContainer` or its active child components.
3. Add focused tests for conversation loading, new conversation routing, stream handling, and abort behavior.
4. Remove stale duplicate components only after parity is verified and no imports remain.

### Safe checks

Run these from `backend/` when available:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Phase 4 deferred notes

- Image attachments remain deferred in the canonical chat path because `/api/chat` currently accepts JSON text messages and does not expose the legacy `image_data` / `image_file` form-data handling needed to submit previews safely.
- Voice input remains deferred because the legacy path is coupled to form-data server actions and `VoiceInput`; it should only be reintroduced after the canonical `/api/chat` contract supports it cleanly.
- Follow-up suggestion chips remain deferred because the legacy implementation is coupled to `useSuggestions(userId)`, animated pin/dismiss controls, and the old form-data submission path; port it after validating the hook output and keeping the integration small.
