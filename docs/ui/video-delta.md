# Video Delta — Digital Void Chat (Source: `vid.mp4`)

This doc captures **concrete UI constants** extracted from the reference video so engineering can match layout, spacing, and feel.

## Video metadata (repo-derived)
- **File**: `vid.mp4`
- **Duration**: 00:00:28.69
- **Resolution**: 390×854 (portrait)
- **FPS**: ~9.38

## Extracted reference frames
Frames were extracted to: `docs/ui/video-frames/`
- **Empty chat + composer (mic visible)**: `frame_01.png`, `frame_02.png`, `frame_09.png`, `frame_10.png`
- **Typing + keyboard open**: `frame_03.png`, `frame_05.png`, `frame_06.png`, `frame_07.png`
- **Sidebar sheet open**: `frame_08.png`

## Design language deltas (what the video does)

### Background (“digital void”)
- **Nearly flat black** with a **very subtle vignette**; no obvious gradients.
- Primary content is the composer; everything else is visually quiet.

### Mobile top chrome
- No full topbar in the video; only a **hamburger icon** in the top-left.
- **Icon treatment**: thin stroke, `white/60` to `white/80` on interaction.
- **Tap target**: ≥ 44×44px.

### Sidebar (mobile sheet)
Seen in `frame_08.png`.
- **Type**: left sheet overlay (rest of screen dimmed).
- **Width**: ~300px (visually matches the existing 300px sidebar pattern).
- **Background**: near-black panel, subtle border.
- **Header content**:
  - Search input (“Search chats”) with a small icon at left.
  - Primary action row: “+ New Chat”.
  - Empty state: “No recent chats.”

Suggested baseline tokens (tune after implementing and A/B’ing against frames):
- **Sheet width**: `w-[300px]`
- **Sheet border**: `border-white/10`
- **Sheet surface**: `bg-black/90` (optionally `backdrop-blur-md` if it matches)

### Chat composer (pill + glow)
Seen in `frame_01.png` and `frame_03.png`.
- **Shape**: pill (full radius), “glass” fill.
- **Placement**:
  - In empty state, composer appears **centered vertically** (not glued to bottom).
  - With keyboard open, composer is **pinned above the keyboard** with comfortable spacing.
- **Glow**: subtle **purple halo** around the composer surface.
- **Placeholder**: “Ask Pandora…”
- **Right action**: mic icon (see constraint below for mic→send behavior).

Suggested baseline tokens:
- **Horizontal inset**: ~16–24px (`px-4` / `px-6`)
- **Height**: 52–56px
- **Radius**: `rounded-full`
- **Fill**: `bg-white/[0.04]` or `bg-black/40` depending on contrast
- **Border**: `border-white/[0.06]`
- **Glow**: `shadow-[0_0_24px_rgba(167,139,250,0.22)]` (purple)

### Icon swap animation (premium feel)
The product requirement overrides the video here:
- **When input is empty** → show **MIC only**
- **When input has text** (`value.trim().length > 0`) → show **SEND only**
- Swap animation must be **fade + slight scale**.

Recommended motion spec:
- **Duration**: 160–220ms
- **Easing**: ease-out
- **Enter**: opacity 0 → 1, scale 0.92 → 1
- **Exit**: opacity 1 → 0, scale 1 → 0.92

### Typography
- Modern SaaS: Inter-like, medium weight for UI labels.
- Minimal labels; avoid dense text in the main chat surface on mobile.

## Implementation notes (where this maps in repo)
- **Primary chat route (current)**: `src/app/(pandora-ui)/page.tsx`
- **Sidebar (current)**: `src/app/(pandora-ui)/components/Sidebar.tsx`
- **Composer (will be replaced/expanded)**:
  - current simple input: `src/app/(pandora-ui)/components/ChatInput.tsx`
  - richer reference implementation (for patterns): `src/components/chat/chat-input.tsx`

## Acceptance checklist for “video match” (mobile)
- Hamburger opens a left sheet that matches `frame_08.png` layout.
- Empty chat shows composer in the same visual “centered” position as `frame_01.png`.
- Keyboard-open state positions composer above keyboard similarly to `frame_03.png`.
- Composer has a subtle purple halo (not neon-noisy).
- MIC↔SEND swap works exactly per spec with premium animation.


