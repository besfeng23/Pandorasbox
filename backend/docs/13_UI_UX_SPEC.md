# UI/UX Specification — Video-Aligned Digital Void SaaS + Admin Cockpit

## Executive summary

UI/UX is the frontend implementation lane for Pandora's Box: the "Digital Void" glassmorphism design system and all user-facing pages (Chat, Knowledge, Memories, Artifacts, Graph, PandoraUI Dashboard, Settings).

The UI plan is grounded in `pandoraplan.txt` and maps to repo-reality signals (file existence, route patterns, component structure). Progress is tracked via Kairos status scoring and Linear epics/issues.

**North Star promise:** "I remember what matters, and I can show you exactly what I used."

Every core surface supports:
- **Continuity** (threads + summaries + retrieval)
- **Traceability** (memories/sources used)
- **Control** (edit memory, clear memory, export)

## Reference video alignment (source of truth)
- **Reference**: `vid.mp4` (repo root)
- **Delta checklist**: `docs/ui/video-delta.md`

Key observed behaviors to match:
- **Mobile**: no persistent topbar; **hamburger** opens a left **sheet sidebar** (`~300px` wide).
- **Composer**: pill surface with subtle **purple halo**; in empty state it is visually emphasized/centered.

## Non-negotiable chat composer spec (implemented)
- **Empty input** → show **MIC only**.
- **Has text** (`value.trim().length > 0`) → MIC disappears; show **SEND only**.
- **Cleared** → swap back to MIC.
- **Enter** sends; **Shift+Enter** newline.
- **Animation**: fade + slight scale (premium feel).

Implemented in:
- `src/app/(pandora-ui)/page.tsx`

## Technical details

### Information Architecture

**Primary routes:**
- `/` — Chat (Home)
- `/knowledge` — Knowledge Base
- `/memories` — Memories
- `/artifacts` — Artifacts
- `/graph` — Graph
- `/pandora-ui` — PandoraUI Dashboard
- `/settings` — Settings

**SaaS additions (multi-tenant):**
- `/workspaces`
- `/workspaces/[id]/members`
- `/workspaces/[id]/billing`
- `/workspaces/[id]/security`
- `/notifications`
- `/integrations` (nice-to-have)

**Admin cockpit (platform):**
- `/admin`
- `/admin/orgs`
- `/admin/users`
- `/admin/support`
- `/admin/moderation`
- `/admin/billing`
- `/admin/feature-flags`
- `/admin/prompts`
- `/admin/models`
- `/admin/ops`
- `/admin/logs`
- `/admin/audit`
- `/admin/data`

**App Shell structure:**
- **Desktop:** Sidebar (280px/72px collapsed) + Main (fluid, max 980–1200px) + Inspector Drawer (360px, optional)
- **Mobile:** Bottom tab bar + Sidebar overlay + Inspector bottom sheet

### Design System: "Digital Void" Cyberpunk Glassmorphism

**Key constraints:**
- Background: deep gradient (not flat black)
- Panels: genuine frosted glass (blur + translucency + subtle border)
- Neon accents: only on focus/active/hover (not everything)

**Video delta**:
- The reference mobile background reads **near-flat black** with a subtle vignette (less gradient than the baseline plan).
- Emphasis is on the composer; keep other UI visually quiet on mobile.

**Core tokens (CSS variables):**
- Backgrounds: `bg-void-0`, `bg-void-1`
- Glass surfaces: `glass-surface`, `glass-surface-strong`
- Borders: `border-soft`, `border-neon-cyan`, `border-neon-purple`
- Text: `text-primary`, `text-secondary`, `text-dim`
- Accents: `accent-cyan`, `accent-purple`, `accent-amber`, `accent-red`

**Theme system:**
- Dark/light mode
- Intensity: Subtle/Neon/Ultra
- CSS variables in `src/styles/digital-void.css` (planned)

### Component Library

**Foundations:**
- `GlassPanel`, `GlassCard`, `NeonBorder`
- `StatusPill`, `IconButton`
- `PrimaryButton`, `SecondaryButton`, `DangerButton`
- `InlineNotice`, `Skeleton`

**Navigation:**
- `ThreadSidebar`, `ThreadRow`
- `GlobalCommandMenu` (Cmd/Ctrl+K)
- `SearchInput` (debounced)

**Chat system:**
- `MessageBubble`, `MessageMetaRow`
- `AssistantEvidenceBlock` (collapsible)
- `FloatingComposer`
- `FollowUpChips`

**Data views:**
- `DataTable` (desktop), `CardList` (mobile)
- `FilterBar`, `EmptyState`

### Page-by-Page Checklist

1. **App Shell** (`src/app/(pandora-ui)/layout.tsx`)
   - ThreadSidebar + Topbar + InspectorDrawer
   - Responsive behavior (<lg: overlay drawers)
   - Context providers (UIState, Auth, Theme)

2. **Chat** (`src/app/(pandora-ui)/page.tsx`)
   - MessageList + FloatingComposer + FollowUpChips
   - Empty state with cube
   - Evidence blocks per assistant message

3. **Settings** (`src/app/(pandora-ui)/settings/page.tsx`)
   - Sections: Model, System prompt, API key, Appearance, Data management
   - Danger zone confirmations

4. **Knowledge Base** (`src/app/(pandora-ui)/knowledge/page.tsx`)
   - Upload dropzone + file list
   - Processing status per upload
   - Search/filter

5. **Memories** (`src/app/(pandora-ui)/memories/page.tsx`)
   - Tabs: Recent, Profile, Rules
   - Search (natural language)
   - Edit/delete actions

6. **Artifacts** (`src/app/(pandora-ui)/artifacts/page.tsx`)
   - List/grid view
   - Artifact viewer (split: editor + preview)
   - Export/copy actions

7. **Graph** (`src/app/(pandora-ui)/graph/page.tsx`)
   - Graph canvas (pan/zoom)
   - Node details panel
   - Filters (time range, relationship type)

8. **PandoraUI Dashboard** (`src/app/(pandora-ui)/pandora-ui/page.tsx`)
   - Phase grid (14 phases from `system_phases`)
   - Telemetry tiles (response time, retrieval hit rate, error rate)
   - Interactive cube centerpiece

## Where in code

**App Shell:**
- Layout: `src/app/(pandora-ui)/layout.tsx`
- Sidebar: `src/app/(pandora-ui)/components/Sidebar.tsx`
- Topbar: `src/app/(pandora-ui)/components/Topbar.tsx`
- Inspector: `src/app/(pandora-ui)/components/InspectorDrawer.tsx` (or similar)

**Pages:**
- Chat: `src/app/(pandora-ui)/page.tsx`
- Settings: `src/app/(pandora-ui)/settings/page.tsx`
- Knowledge: `src/app/(pandora-ui)/knowledge/page.tsx` (planned)
- Memories: `src/app/(pandora-ui)/memories/page.tsx` (planned)
- Artifacts: `src/app/(pandora-ui)/artifacts/page.tsx` (planned)
- Graph: `src/app/(pandora-ui)/graph/page.tsx` (exists, may need updates)
- PandoraUI Dashboard: `src/app/(pandora-ui)/pandora-ui/page.tsx` (planned)

**Shared components:**
- Command menu: `src/components/command-menu.tsx` (exists)
- Theme hook: `src/hooks/use-theme.tsx` (planned)
- Toast/Modal utilities: (planned, likely shadcn/ui or similar)

**Admin (new):**
- Layout: `src/app/(admin)/admin/layout.tsx`
- Guard: `src/app/(admin)/admin/components/AdminGuard.tsx`
- Sidebar/Topbar: `src/app/(admin)/admin/components/AdminSidebar.tsx`, `AdminTopbar.tsx`

**Theme system:**
- CSS tokens: `src/styles/digital-void.css` (planned)
- Theme provider: (planned, likely in layout or provider file)

**Component library (planned locations):**
- Foundations: `src/components/ui/` (or similar structure)
- Chat: `src/app/(pandora-ui)/components/` (or `src/components/chat/`)
- Navigation: `src/app/(pandora-ui)/components/` (or `src/components/navigation/`)

## Assumptions

- Next.js App Router structure (`src/app/(pandora-ui)/`)
- Route groups used for app shell isolation
- Component library structure follows existing patterns (may use shadcn/ui or similar)
- Theme system uses CSS variables (HSL format for easy alpha control)
- Responsive breakpoints: sm < 640px, md 768px, lg 1024px, xl ≥ 1280px
- Firestore/Firebase Auth integration already exists (from backend modules)
- PandoraUI Dashboard reads from `system_phases` collection (existing backend)
- Telemetry data available from existing backend systems

