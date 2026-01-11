# Pandora UI/UX Build Plan

## Executive summary

This document is derived from `pandoraplan.txt` and outlines the complete UI/UX blueprint for Pandora's Box. It covers the global information architecture, layout system, design system, component library, and screen-by-screen specifications. The plan is organized so engineering can build with minimal redesign loops.

**Scope note:** Kairos is Base44-backed (entities). Firestore mentions in this document are conceptual unless proven in the repo.

**Update:** The chat UI and shell are now **video-aligned** to `vid.mp4` and extended for **multi-tenant workspaces + admin cockpit**.

## Technical details

### Global Information Architecture

**Primary modules (user-facing):**
1. Chat (Home) — `/`
2. Knowledge Base — `/knowledge`
3. Memories — `/memories`
4. Artifacts — `/artifacts`
5. Graph — `/graph`
6. PandoraUI Dashboard — `/pandora-ui`
7. Settings — `/settings`

**SaaS additions (multi-tenant):**
- Workspaces list — `/workspaces`
- Workspace members — `/workspaces/[id]/members`
- Workspace billing — `/workspaces/[id]/billing`
- Workspace security — `/workspaces/[id]/security`
- Notifications — `/notifications`
- Integrations — `/integrations` (nice-to-have)

**Admin cockpit (platform):**
- `/admin` (+: `/admin/orgs`, `/admin/users`, `/admin/support`, `/admin/moderation`, `/admin/billing`, `/admin/feature-flags`, `/admin/prompts`, `/admin/models`, `/admin/ops`, `/admin/logs`, `/admin/audit`, `/admin/data`)

**Global navigation model:**
- Desktop: Left (Thread Sidebar), Top (Topbar), Right (Inspector Drawer)
- Mobile: Bottom tab bar (max 5 icons), Threads via top-left, Inspector as bottom sheet

### Layout System (App Shell)

**Desktop:**
- Left column (Threads): 280px expanded / 72px collapsed
- Center (Main view): Fluid with max width constraints
- Right column (Inspector): 360px

**Mobile:**
- Topbar is hidden; hamburger opens left sheet (video behavior)
- Inspector becomes modal sheet with tabs

### Design System

**Theme:** "Digital Void" Cyberpunk Glassmorphism
- Background: Deep gradient (not flat black)
- Panels: Frosted glass (blur + translucency + subtle border)
- Neon: Only highlights focus and active state

**Video delta:** on mobile, the reference reads closer to flat black + subtle vignette; composer has a subtle purple halo.

**Core tokens:**
- Backgrounds: `bg-void-0`, `bg-void-1`
- Glass surfaces: `glass-surface`, `glass-surface-strong`
- Borders: `border-soft`, `border-neon-cyan`, `border-neon-purple`
- Text: `text-primary`, `text-secondary`, `text-dim`
- Accents: `accent-cyan`, `accent-purple`, `accent-amber`, `accent-red`

**Typography:**
- Font: Inter
- Code/logs: JetBrains Mono

**Motion:**
- Hover/focus: 150–220ms
- Drawer open/close: 220–300ms

### Component Library

**Foundations:**
- `GlassPanel`, `GlassCard`
- `NeonBorder` (conditional)
- `StatusPill`
- `IconButton`
- `PrimaryButton`, `SecondaryButton`, `DangerButton`
- `InlineNotice`, `Skeleton`

**Navigation + Search:**
- `ThreadSidebar`, `ThreadRow`
- `GlobalCommandMenu`
- `SearchInput` (debounced)

**Chat system:**
- `MessageBubble`, `MessageMetaRow`
- `AssistantEvidenceBlock`
- `FloatingComposer`
- `FollowUpChips`

**Data views:**
- `DataTable` (desktop), `CardList` (mobile)
- `FilterBar`, `EmptyState`

### Screen Specifications

**Chat (`/`):**
- Layout: Threads left, messages center, inspector right
- Components: `MessageList`, `MessageCard`, `FloatingComposer`, `FollowUpChips`
- Empty state: Interactive cube centerpiece

**Non-negotiable composer behavior (implemented):**
- Empty input → MIC only
- Text present (`trim().length > 0`) → SEND only
- Enter sends; Shift+Enter newline

**Settings (`/settings`):**
- Sections: Model, Reply style, System prompt, API key, Appearance, Notifications, Data management
- Danger zone: Clear memory, Clear all data (with confirm modals)

**Knowledge Base (`/knowledge`):**
- Upload dropzone with progress tracking
- File list (table desktop, cards mobile)
- Processing stages: Parsing → Chunking → Embedding → Complete

**Memories (`/memories`):**
- Tabs: Recent, Validated (future), Profile, Rules
- Search with natural language
- Edit/delete actions

**Artifacts (`/artifacts`):**
- List view with filters (type, thread, date)
- Viewer: Split view (code editor left, rendered preview right)
- Actions: Copy, Export, Create new version (future)

**Graph (`/graph`):**
- Canvas with pan/zoom
- Node details panel
- Controls: Search, Zoom, Fit, Filters

**PandoraUI Dashboard (`/pandora-ui`):**
- System health pill + quick tiles (latency, queue, error rate, cron status)
- Phase grid (14 phases)
- Telemetry panel (charts)
- Interactive cube centerpiece

## Where in code

**App Shell:**
- `src/app/(pandora-ui)/layout.tsx` — Main shell layout
- `src/app/(pandora-ui)/components/Topbar.tsx` — Top navigation bar
- `src/app/(pandora-ui)/components/Sidebar.tsx` — Thread navigation + workspace switcher
- `src/app/(pandora-ui)/components/InspectorDrawer.tsx` — Right inspector panel

**Pages:**
- `src/app/(pandora-ui)/page.tsx` — Chat (home)
- `src/app/(pandora-ui)/settings/page.tsx` — Settings
- `src/app/(pandora-ui)/knowledge/page.tsx` — Knowledge Base
- `src/app/(pandora-ui)/memories/page.tsx` — Memories
- `src/app/(pandora-ui)/artifacts/page.tsx` — Artifacts
- `src/app/(pandora-ui)/graph/page.tsx` — Graph visualization
- `src/app/(pandora-ui)/pandora-ui/page.tsx` — PandoraUI Dashboard

**Components:**
- `src/components/command-menu.tsx` — Global command menu (Cmd+K)
- `src/app/(pandora-ui)/components/MessageList.tsx` — Message stream
- `src/app/(pandora-ui)/components/MessageCard.tsx` — Individual message
- `src/app/(pandora-ui)/components/AssistantEvidenceBlock.tsx` — Evidence display
- `src/app/(pandora-ui)/components/FloatingComposer.tsx` — Chat input
- `src/app/(pandora-ui)/components/FollowUpChips.tsx` — Suggested prompts

**Theme:**
- `src/styles/digital-void.css` — Theme tokens (CSS variables)
- `tailwind.config.ts` — Tailwind configuration (theme mapping)
- `src/lib/theme.ts` — Theme utilities and hooks

**Shared:**
- `src/components/ui/` — shadcn/ui primitives (toasts, modals, dialogs)
- Server actions for data fetching (chat, upload, search, settings)

**Admin (new):**
- `src/app/(admin)/admin/layout.tsx`
- `src/app/(admin)/admin/components/AdminGuard.tsx`
- `src/app/(admin)/admin/components/AdminSidebar.tsx`
- `src/app/(admin)/admin/components/AdminTopbar.tsx`

## Assumptions

- App Shell layout exists and is consistent across pages
- Firebase Auth handles authentication UI (cohesive styling expected)
- Theme system uses CSS variables for tokens
- All destructive actions require confirmation modals
- Mobile breakpoint: `< lg` (1024px)
- Empty states always include title, description, and primary CTA where applicable

