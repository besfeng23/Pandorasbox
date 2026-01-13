'use server';

import { getAuthAdmin } from '@/lib/firebase-admin';
import { saveMemory } from '@/lib/memory-utils';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function storeDesignSystemMemory(userEmail: string): Promise<{ success: boolean; memory_id?: string; message?: string }> {
  try {
    // Get user ID from email
    const authAdmin = getAuthAdmin();
    const firebaseUser = await authAdmin.getUserByEmail(userEmail);
    const userId = firebaseUser.uid;

    // Read the PRD file
    const prdPath = join(process.cwd(), 'tesy');
    const prdContent = readFileSync(prdPath, 'utf-8');

    // Read additional design files
    let tailwindConfig = '';
    try {
      tailwindConfig = readFileSync(join(process.cwd(), 'tailwind.config.ts'), 'utf-8');
    } catch {
      // Ignore if file doesn't exist
    }

    let globalsCss = '';
    try {
      globalsCss = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf-8');
    } catch {
      // Ignore if file doesn't exist
    }

    // Compile comprehensive design system memory
    const designSystemMemory = `# Pandora's Box - Complete Design System Documentation for Head of Design

## Product Requirements Document (PRD)
${prdContent}

## Design System Specifications

### Brand Colors & Design Tokens
Primary Color (Cyan): #00E5FF (HSL: 190 100% 55%)
Secondary Color (Violet): #A78BFA (HSL: 262 83% 62%)
Background: Deep gradient from hsl(222, 18%, 6%) to hsl(222, 18%, 8%)
Card Background: hsl(222, 18%, 10%)
Foreground: hsl(210, 20%, 98%)

### Tailwind Configuration
${tailwindConfig.substring(0, 2000)}${tailwindConfig.length > 2000 ? '...' : ''}

### Global Styles & CSS Variables
${globalsCss.substring(0, 3000)}${globalsCss.length > 3000 ? '...' : ''}

## Key Design Elements

### Brand Identity
- Logo: Pandora's Box cube (cube2.png, cube3.png)
- Color Palette: Cyan (#00E5FF) to Violet (#A78BFA) gradient
- Theme: Dark-first with neon accents
- Aesthetic: Circuit board textures, glass panels, neon glows

### UI Components
- Glass panels with frosted effect (backdrop-blur, rgba(255,255,255,0.04))
- Gradient borders (cyan to violet, linear-gradient(135deg))
- Neon glow effects (box-shadow with rgba(0, 229, 255, 0.3))
- Energy burst animations (scale transform with glow)
- Circuit texture backgrounds (repeating-linear-gradient)
- Starry background effects (radial-gradient specks)

### Typography
- Font system: Inter (primary), system fonts (fallback)
- Code font: JetBrains Mono
- Font sizes: Small (0.875rem), Medium (1rem), Large (1.125rem)
- Line height: 1.7 for readability

### Spacing & Layout
- Border radius: 0.75rem (default, --radius)
- Padding: Consistent 4px grid system
- Max widths: 3xl (768px) for chat, 6xl (1152px) for pages
- Sidebar: 280px (desktop), collapsible to 72px

### Accessibility
- Focus states: 2px solid cyan outline (rgba(0, 229, 255, 0.8))
- Keyboard navigation: Full support
- Reduced motion: Supported via prefers-reduced-motion
- Touch targets: Minimum 44px height

## Design Files Location
- PRD: tesy (root directory, 2199 lines)
- Tailwind Config: tailwind.config.ts
- Global Styles: src/app/globals.css
- Components: src/components/
- App Pages: src/app/(pandora-ui)/

## Design Requirements Summary

### Visual Design
1. Dark theme with cyan-violet gradient accents
2. Glass morphism effects (frosted glass panels with backdrop-blur)
3. Neon glow effects on interactive elements (hover/active states)
4. Circuit board texture patterns (subtle, repeating gradients)
5. Starry background with cyan/violet specks (radial gradients)
6. Energy burst animations on interactions (scale + glow)

### Component Design
1. Message bubbles: Differentiated by role (user vs assistant)
   - User: Right-aligned, lighter glass, gradient border
   - Assistant: Left-aligned, darker glass, neon border
2. Input bar: Elevated with shadow, neon borders, glass panel
3. Sidebars: Collapsible, glass panels, neon accents on active
4. Command menu: Glass panel with neon accents, keyboard navigation
5. Buttons: Neon glow on hover, energy burst on click

### Responsive Design
1. Mobile-first approach
2. Collapsible sidebars on mobile (hamburger menu)
3. Touch-friendly targets (min 44px)
4. Responsive grid layouts (1 column mobile, 2-3 desktop)

### Brand Consistency
- All UI elements should reflect the neon gradient aesthetic
- Circuit textures should be subtle but present
- Energy animations should feel responsive and modern
- Glass panels should create depth without overwhelming
- Color usage: Cyan for primary actions, Violet for secondary, gradients for emphasis

## Implementation Notes
- All design tokens are in globals.css (CSS variables)
- Tailwind config extends base design system
- Components use shadcn/ui as base, customized with brand styling
- Brand colors: Primary (cyan #00E5FF), Secondary (violet #A78BFA)
- All interactive elements should have neon glow on hover/active
- Glass panels use: backdrop-blur-xl, bg-card/40, border-primary/20
- Neon glows use: box-shadow with rgba(0, 229, 255, 0.3) for cyan, rgba(167, 139, 250, 0.3) for violet`;

    // Save the memory
    const memoryResult = await saveMemory({
      content: designSystemMemory,
      userId: userId,
      source: 'design-system',
      type: 'normal',
      metadata: {
        title: 'Complete Design System Documentation for Head of Design',
        documentType: 'design-system',
        includesPRD: true,
        includesDesignTokens: true,
        includesComponentSpecs: true,
        createdFor: 'head-of-design',
        userEmail: userEmail,
      },
    });

    if (!memoryResult.success || !memoryResult.memory_id) {
      return { success: false, message: memoryResult.message || 'Failed to save memory' };
    }

    return {
      success: true,
      memory_id: memoryResult.memory_id,
      message: 'Design system memory stored successfully',
    };
  } catch (error: any) {
    console.error('Error storing design system memory:', error);
    return {
      success: false,
      message: `Failed to store memory: ${error.message || 'Unknown error'}`,
    };
  }
}



