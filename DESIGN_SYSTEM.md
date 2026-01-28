# Frontend Design System - Pandora's Box

**Status: Locked** - These design guidelines must be followed for all frontend work.

## Color & Materials

- **Prefer "materials" over opaque panels** for overlays: blur + translucency
- Use **very light border + soft shadow** instead of heavy drop shadows
- **Card shadow (light)**: `0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)`
- **Card shadow (dark)**: `0 1px 2px rgba(0,0,0,0.50), 0 8px 24px rgba(0,0,0,0.35)`
- Hairline border is often enough; shadow should be barely noticeable
- Keep contrast high for text and controls; avoid grey-on-grey

## Layout

### Spacing System (8pt Grid)
- **Base unit**: 8pt system (8, 16, 24, 32, 40, 48)
- **Micro spacing**: 4pt only for tight internal padding or icon-label gaps
- **Max content width**: 
  - 1120–1200px for dense desktop views
  - 960px for reading-focused
- **Side padding**: 
  - 24px desktop
  - 16px tablet
  - 12–16px mobile
- **Vertical rhythm**: 
  - 24–32px between major sections
  - 12–16px between related elements

### Corner Radius
- **Default**: 12px
- **Prominent cards/modals**: 16px
- **Hero surfaces**: 20–24px
- **Buttons**: 10–12px (Apple-ish), with clear pressed state

### Inputs & Controls
- **Input height**: 44px minimum; align to comfortable touch targets
- Use a single dominant header per view; keep toolbars minimal
- Prefer segmented controls, tabs, and inline filters over noisy side panels
- Avoid heavy dividers; rely on spacing and subtle separators

### Design Philosophy
- **Apple-feel is "calm" by default**: fewer simultaneous accents, fewer competing card styles, less visual noise
- If you need density, keep it typographic (clean tables, consistent columns) rather than decorative
- Employ a clean, top-level Apple-esque layout with generous spacing, subtle shadows, and soft rounded corners
- Ensure responsive design for mobile-friendliness

## Typography

### Font Stack
- **Body and headline font**: 'Inter', a grotesque-style sans-serif with a modern, machined, objective, neutral look
- **Preferred (if available)**: SF Pro (iOS/macOS)
- **Web fallback**: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Monospace**: `ui-monospace, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`

### Type Scale (size / line-height, weight)
- **Large Title**: 34 / 41, weight 600
- **Title 1**: 28 / 34, weight 600
- **Title 2**: 22 / 28, weight 600
- **Title 3**: 20 / 25, weight 600
- **Headline**: 17 / 22, weight 600
- **Body**: 17 / 24, weight 400
- **Callout**: 16 / 22, weight 400–500
- **Subhead**: 15 / 20, weight 400–500
- **Footnote**: 13 / 18, weight 400
- **Caption**: 12 / 16, weight 400–500

### Typography Guidelines
- Use **weight and spacing more than color** to establish hierarchy
- Avoid all-caps UI except for tiny labels; if used, letter spacing +2% to +6%
- Keep line length ~45–75 characters for reading blocks
- **Links**: use accent color + medium weight; avoid underlines except for dense text pages

## Iconography

### Style
- **Think SF Symbols**: geometric, rounded corners, consistent stroke, minimal detail
- **Stroke**: 
  - 1.5px (16–20px icons)
  - 2px (24px icons)
- **End caps/joins**: round
- Prefer **outline icons** for most UI; use filled icons only for "selected" states

### Sizes
- Common sizes: 16, 20, 24
- **Optical alignment**: icons often need 1px vertical nudges to feel centered
- **Icon-to-label gap**: 8px (or 6px in compact toolbars)

### Guidelines
- **Do**: consistent family, consistent stroke, consistent corner rounding
- **Don't**: mix outline and solid styles randomly; avoid overly detailed glyphs; avoid "cute" icon sets unless your product is playful

## Animation

### Timing
- **Tap/press feedback**: 80–120ms
- **Small transitions** (hover, toggle, focus): 120–180ms
- **Panel/dialog transitions**: 240–320ms
- **Page-level transitions**: 280–420ms (use sparingly)

### Easing
- **Standard**: `cubic-bezier(0.2, 0.0, 0.0, 1.0)` (fast-out, slow-in)
- **Emphasized**: same curve with longer duration (not bouncier)
- **Springy feel** (subtle): spring with low bounce (if using a spring system, keep bounce minimal)

### Interaction Patterns
- **Buttons**: slight scale down on press (0.98) + subtle darken/overlay, return on release
- **Cards**: on hover, raise 2–4px with a slightly stronger shadow; keep it gentle
- **Modals/sheets**: fade + translate Y 8–16px + slight scale (0.98 → 1.0)
- **Lists**: insertion/removal uses opacity + height; avoid wild sliding

### Motion Principles
- Motion should clarify cause/effect and feel physically plausible
- No gimmicks, no excessive overshoot
- **Respect "Reduced Motion"**: replace transforms with simple fades
- **Focus rings**: 2px outline in accent color with ~30–40% alpha outer glow

## Implementation Notes

- Incorporate subtle animations for loading states, transitions, and user interactions
- Example: smooth fade-in for new messages
- All frontend components should follow these guidelines for consistency
- When in doubt, prefer the "calm" Apple-esque aesthetic over decorative elements
