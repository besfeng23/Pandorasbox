# Frontend System — Routes, UI Surfaces, State, UX

## Purpose
Describe the Next.js App Router routes, page inventory, component map, state management, error/empty states, and settings UX **as implemented**.

## High-level UI surfaces
### Primary UI: Pandora UI
- **Route group**: `src/app/(pandora-ui)/*`
- **Layout**: `src/app/(pandora-ui)/layout.tsx` (wraps `AuthGuard`, uses Sidebar/Topbar/menus, shows Phase dashboard)
- **Pages**:
  - Chat: `src/app/(pandora-ui)/page.tsx`
  - Settings: `src/app/(pandora-ui)/settings/page.tsx`
  - Knowledge graph: `src/app/(pandora-ui)/graph/page.tsx`

### Legacy UI surface
- `src/components/pandoras-box.tsx` is a client-side container with split views (chat + memory inspector + artifacts).

Assumption: both UIs are still relevant; the repo contains both `src/app/(pandora-ui)` and `src/components/pandoras-box.tsx`. Operationally, the active route group is the App Router entrypoint under `src/app/(pandora-ui)`.

## Routing
- Next.js App Router is used; API routes live under `src/app/api/**/route.ts`.
- The app root layout is `src/app/layout.tsx`.

## Component map (key pieces)
### Chat UX
- `src/app/(pandora-ui)/components/ChatMessages.tsx`, `ChatInput.tsx`, and `PandoraBoxInteractive.tsx`
- Legacy: `src/components/chat/*` plus `src/components/chat/chat-messages.tsx` and `src/components/chat/chat-input.tsx`

### Sidebars / navigation
- Pandora UI: `src/app/(pandora-ui)/components/Sidebar.tsx`, `Topbar.tsx`, `PandoraMenu.tsx`, `SettingsModal.tsx`, `SettingsDrawer.tsx`
- Legacy: `src/components/chat/chat-sidebar.tsx`, `src/components/layout/memory-inspector.tsx`

### Phase UI
- `src/app/(pandora-ui)/components/PhaseIndicator.tsx`
- `src/app/(pandora-ui)/components/PhaseDashboard.tsx` (reads `system_phases` and telemetry collections)

### Knowledge graph UI
- `src/app/(pandora-ui)/graph/page.tsx` renders `src/components/GraphView.tsx`

## State management
- **Firebase auth state**: `src/firebase/auth/*` and `useUser()` (`src/firebase/*`)
- **Realtime Firestore subscriptions**:
  - Chat history: `src/hooks/use-chat-history.ts` (subscribes to `threads/{threadId}` and `history` query filtered by `userId` + `threadId`)
  - Settings: `src/hooks/use-settings.ts` (subscribes to `settings/{userId}`)
- **Local client stores**:
  - Artifacts: Zustand store `src/store/artifacts.ts` (selected artifact ID)
  - Connection status: `src/store/connection.ts`

## UX: error states and empty states
### Chat empty state
- Pandora UI: when no messages and not loading, shows `PandoraBoxInteractive` (`src/app/(pandora-ui)/page.tsx`).
- Legacy UI: shows loading spinners, network/offline states, and supports split-view toggles (`src/components/pandoras-box.tsx`).

### Missing Firestore index
The chat history hook explicitly detects missing index errors and surfaces a user-facing error message:\n- `src/hooks/use-chat-history.ts` checks for “failed-precondition” / “index” substrings and sets an error.

### Settings UX
Settings page has multiple tabs:
- General: model selection, reply style, prompt override, appearance
- Memory: knowledge upload, memory table, reindex button, “Danger Zone” clear
- API: personal API key generation
- Brain controls: manual triggers for reflection/research and identity seeding
- Data: export user data JSON

See: `src/app/(pandora-ui)/settings/page.tsx`.

## Where in code
- Primary UI routes: `src/app/(pandora-ui)/*`
- Root layout: `src/app/layout.tsx`
- Legacy UI: `src/components/pandoras-box.tsx`
- Settings page: `src/app/(pandora-ui)/settings/page.tsx`
- Hooks: `src/hooks/use-chat-history.ts`, `src/hooks/use-settings.ts`
- Stores: `src/store/*`


