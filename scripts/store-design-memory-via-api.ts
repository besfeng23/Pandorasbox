import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

const GATEWAY_URL = process.env.KAIROS_EVENT_GATEWAY_URL || 'https://kairos-event-gateway-axypi7xsha-as.a.run.app';
const API_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';
const CHATGPT_API_KEY = process.env.CHATGPT_API_KEY || process.env.NEXT_PUBLIC_CHATGPT_API_KEY;

async function getAuthToken(): Promise<string | undefined> {
  try {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(GATEWAY_URL);
    const headers = await client.getRequestHeaders();
    return headers.Authorization?.replace('Bearer ', '') || undefined;
  } catch (error: any) {
    console.error(`❌ Failed to get identity token: ${error.message}`);
    return undefined;
  }
}

async function sendKairosEvent(event: any, token?: string): Promise<boolean> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${GATEWAY_URL}/v1/event`, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
    });

    return response.ok;
  } catch (error: any) {
    console.error(`❌ Error sending event: ${error.message}`);
    return false;
  }
}

async function storeMemoryViaAPI(content: string, userEmail: string): Promise<{ success: boolean; memory_id?: string; error?: string }> {
  if (!CHATGPT_API_KEY) {
    throw new Error('CHATGPT_API_KEY or NEXT_PUBLIC_CHATGPT_API_KEY environment variable is required');
  }

  try {
    const response = await fetch(`${API_URL}/api/chatgpt/store-memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHATGPT_API_KEY}`,
        'x-api-key': CHATGPT_API_KEY,
      },
      body: JSON.stringify({
        memory: content,
        user_email: userEmail,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    const data = await response.json();
    return { success: true, memory_id: data.memory_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🎨 Storing Design System Memory for Head of Design');
  console.log('');

  const userEmail = 'joven.ong23@gmail.com';

  // Read the PRD file
  const prdPath = join(process.cwd(), 'tesy');
  let prdContent = '';
  try {
    prdContent = readFileSync(prdPath, 'utf-8');
    console.log(`✅ Read PRD file (${prdContent.length} characters)`);
  } catch (error: any) {
    console.error(`❌ Failed to read PRD file: ${error.message}`);
    process.exit(1);
  }

  // Read additional design files
  const tailwindConfigPath = join(process.cwd(), 'tailwind.config.ts');
  let tailwindConfig = '';
  try {
    tailwindConfig = readFileSync(tailwindConfigPath, 'utf-8');
    console.log(`✅ Read Tailwind config`);
  } catch (error: any) {
    console.warn(`⚠️  Could not read Tailwind config: ${error.message}`);
  }

  const globalsCssPath = join(process.cwd(), 'src/app/globals.css');
  let globalsCss = '';
  try {
    globalsCss = readFileSync(globalsCssPath, 'utf-8');
    console.log(`✅ Read globals.css`);
  } catch (error: any) {
    console.warn(`⚠️  Could not read globals.css: ${error.message}`);
  }

  // Compile comprehensive design system memory
  // Split into chunks if too large (Firestore has 1MB limit per document)
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

  // Store the memory via API
  console.log('');
  console.log('💾 Storing design system memory via API...');
  const result = await storeMemoryViaAPI(designSystemMemory, userEmail);

  if (!result.success || !result.memory_id) {
    console.error('❌ Failed to store memory:', result.error);
    process.exit(1);
  }

  const memoryId = result.memory_id;
  console.log(`✅ Memory stored successfully!`);
  console.log(`📝 Memory ID: ${memoryId}`);
  console.log('');

  // Send event to Kairos
  console.log('📡 Sending event to Kairos...');
  const kairosToken = await getAuthToken();
  if (!kairosToken) {
    console.warn('⚠️  Could not get Kairos auth token, skipping event');
  } else {
    const timestamp = new Date().toISOString();
    const event = {
      schemaVersion: 1,
      timestamp,
      dedupeKey: `design-system-memory:${memoryId}`,
      source: 'design',
      action: 'memory.created',
      status: 'ok',
      module: 'design-system',
      refType: 'memory',
      refId: memoryId,
      tags: ['design-system', 'prd', 'memory', 'head-of-design'],
      metadata: {
        title: 'Design System Memory Created',
        memoryId: memoryId,
        userEmail: userEmail,
        documentType: 'design-system',
        includesPRD: true,
        contentLength: designSystemMemory.length,
      },
    };

    const sent = await sendKairosEvent(event, kairosToken);
    if (sent) {
      console.log('✅ Event sent to Kairos');
    } else {
      console.warn('⚠️  Failed to send event to Kairos');
    }
  }

  console.log('');
  console.log('✅ Complete!');
  console.log(`📝 Memory ID: ${memoryId}`);
  console.log(`👤 User: ${userEmail}`);
  console.log(`📊 Check Kairos: https://kairostrack.base44.app`);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});



