import { GoogleAuth } from 'google-auth-library';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { saveMemory } from '@/lib/memory-utils';
import { readFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

const GATEWAY_URL = process.env.KAIROS_EVENT_GATEWAY_URL || 'https://kairos-event-gateway-axypi7xsha-as.a.run.app';
const GOOGLE_ID_TOKEN = process.env.GOOGLE_ID_TOKEN;

async function getAuthToken(): Promise<string | undefined> {
  if (GOOGLE_ID_TOKEN) {
    return GOOGLE_ID_TOKEN;
  }

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

async function main() {
  console.log('🎨 Storing Design System Memory for Head of Design');
  console.log('');

  const userEmail = 'joven.ong23@gmail.com';
  
  // Get user ID from email
  let userId: string;
  try {
    const authAdmin = getAuthAdmin();
    const firebaseUser = await authAdmin.getUserByEmail(userEmail);
    userId = firebaseUser.uid;
    console.log(`✅ Found user: ${userEmail} (UID: ${userId})`);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      console.error(`❌ Could not find user or authenticate. Error: ${error.message}`);
      console.error(`   Please ensure:`);
      console.error(`   1. User ${userEmail} exists in Firebase Auth`);
      console.error(`   2. GOOGLE_CLOUD_PROJECT or GOOGLE_APPLICATION_CREDENTIALS is set`);
      console.error(`   3. Firebase Admin SDK is properly initialized`);
      
      // Try alternative: look up by email in Firestore if user exists
      console.log('');
      console.log('🔄 Attempting alternative lookup via Firestore...');
      try {
        const firestoreAdmin = getFirestoreAdmin();
        // Check if we can query users collection (if it exists)
        // For now, we'll need the user to exist in Firebase Auth
        throw new Error('User lookup failed. Please ensure Firebase Admin is properly configured.');
      } catch (altError: any) {
        process.exit(1);
      }
    }
    throw error;
  }

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
  const designSystemMemory = `# Pandora's Box - Complete Design System Documentation for Head of Design

## Product Requirements Document (PRD)
${prdContent}

## Design System Specifications

### Brand Colors & Design Tokens
${globalsCss.includes('--primary:') ? globalsCss.match(/--primary:.*?;/g)?.join('\n') || 'See globals.css for full color definitions' : 'See globals.css for full color definitions'}

### Tailwind Configuration
${tailwindConfig.substring(0, 2000)}${tailwindConfig.length > 2000 ? '...' : ''}

### Global Styles
${globalsCss.substring(0, 3000)}${globalsCss.length > 3000 ? '...' : ''}

## Key Design Elements

### Brand Identity
- Logo: Pandora's Box cube (cube2.png, cube3.png)
- Color Palette: Cyan (#00E5FF) to Violet (#A78BFA) gradient
- Theme: Dark-first with neon accents
- Aesthetic: Circuit board textures, glass panels, neon glows

### UI Components
- Glass panels with frosted effect
- Gradient borders (cyan to violet)
- Neon glow effects
- Energy burst animations
- Circuit texture backgrounds
- Starry background effects

### Typography
- Font system: Inter (primary), system fonts (fallback)
- Font sizes: Small (0.875rem), Medium (1rem), Large (1.125rem)
- Line height: 1.7 for readability

### Spacing & Layout
- Border radius: 0.75rem (default)
- Padding: Consistent 4px grid system
- Max widths: 3xl (768px) for chat, 6xl (1152px) for pages

### Accessibility
- Focus states: 2px solid cyan outline
- Keyboard navigation: Full support
- Reduced motion: Supported via prefers-reduced-motion

## Design Files Location
- PRD: tesy (root directory)
- Tailwind Config: tailwind.config.ts
- Global Styles: src/app/globals.css
- Components: src/components/
- App Pages: src/app/(pandora-ui)/

## Design Requirements Summary

### Visual Design
1. Dark theme with cyan-violet gradient accents
2. Glass morphism effects (frosted glass panels)
3. Neon glow effects on interactive elements
4. Circuit board texture patterns
5. Starry background with cyan/violet specks
6. Energy burst animations on interactions

### Component Design
1. Message bubbles: Differentiated by role (user vs assistant)
2. Input bar: Elevated with shadow, neon borders
3. Sidebars: Collapsible, glass panels
4. Command menu: Glass panel with neon accents
5. Buttons: Neon glow on hover, energy burst on click

### Responsive Design
1. Mobile-first approach
2. Collapsible sidebars on mobile
3. Touch-friendly targets (min 44px)
4. Responsive grid layouts

### Brand Consistency
- All UI elements should reflect the neon gradient aesthetic
- Circuit textures should be subtle but present
- Energy animations should feel responsive and modern
- Glass panels should create depth without overwhelming

## Implementation Notes
- All design tokens are in globals.css
- Tailwind config extends base design system
- Components use shadcn/ui as base, customized with brand styling
- Brand colors: Primary (cyan), Secondary (violet)
- All interactive elements should have neon glow on hover/active`;

  // Save the memory
  console.log('');
  console.log('💾 Saving design system memory...');
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
    console.error('❌ Failed to save memory:', memoryResult.message);
    process.exit(1);
  }

  const memoryId = memoryResult.memory_id;
  console.log(`✅ Memory saved successfully!`);
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
        userId: userId,
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

