import { GoogleAuth } from 'google-auth-library';
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

async function storeMemoryDirectly(content: string, userEmail: string): Promise<{ success: boolean; memory_id?: string; error?: string }> {
  // Try direct Firestore write using Firebase Admin
  try {
    // Set quota project for ADC
    if (!process.env.GOOGLE_CLOUD_PROJECT) {
      process.env.GOOGLE_CLOUD_PROJECT = 'seismic-vista-480710-q5';
    }
    
    const { getFirestoreAdmin } = await import('../src/lib/firebase-admin');
    const { saveMemory } = await import('../src/lib/memory-utils');
    
    // Try to get user ID from Firestore directly (bypass Auth Admin to avoid quota project issues)
    const firestoreAdmin = getFirestoreAdmin();
    let userId: string | null = null;
    
    // Try querying memories collection for any memory with this email in metadata
    try {
      const memoriesSnapshot = await firestoreAdmin
        .collection('memories')
        .where('metadata.userEmail', '==', userEmail)
        .limit(1)
        .get();
      
      if (!memoriesSnapshot.empty) {
        const memoryDoc = memoriesSnapshot.docs[0];
        const memoryData = memoryDoc.data();
        userId = memoryData.userId;
        console.log(`✅ Found user ID from existing memories: ${userId}`);
      }
    } catch (error: any) {
      console.warn(`⚠️  Could not query memories: ${error.message}`);
    }
    
    // If not found, try using Auth Admin (may fail but worth trying)
    if (!userId) {
      try {
        const { getAuthAdmin } = await import('../src/lib/firebase-admin');
        const authAdmin = getAuthAdmin();
        const firebaseUser = await authAdmin.getUserByEmail(userEmail);
        userId = firebaseUser.uid;
        console.log(`✅ Found user ID from Auth Admin: ${userId}`);
      } catch (error: any) {
        throw new Error(`Could not find user ID for ${userEmail}. Tried Firestore queries and Auth Admin. Error: ${error.message}`);
      }
    }

    if (!userId) {
      throw new Error(`Could not determine user ID for ${userEmail}`);
    }

    // Save memory using the utility function
    const result = await saveMemory({
      content: content,
      userId: userId,
      source: 'prd-design-system',
      type: 'normal',
      metadata: {
        title: 'Complete PRD and Design System Documentation',
        documentType: 'prd-and-design-system',
        includesPRD: true,
        includesDesignTokens: true,
        includesComponentSpecs: true,
        userEmail: userEmail,
      },
    });

    if (!result.success || !result.memory_id) {
      return { success: false, error: result.message || 'Failed to save memory' };
    }

    return { success: true, memory_id: result.memory_id };
  } catch (error: any) {
    // If direct write fails, try using the deployed API
    console.warn(`⚠️  Direct write failed: ${error.message}`);
    console.log('🔄 Trying deployed API instead...');
    return await storeMemoryViaAPI(content, userEmail);
  }
}

async function storeMemoryViaAPI(content: string, userEmail: string): Promise<{ success: boolean; memory_id?: string; error?: string }> {
  // Try Cloud Function URL first, then fallback to web app
  const API_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ssrseismicvista480710q5-axypi7xsha-as.a.run.app' || 'https://seismic-vista-480710-q5.web.app';
  const CHATGPT_API_KEY = process.env.CHATGPT_API_KEY || process.env.NEXT_PUBLIC_CHATGPT_API_KEY;
  
  if (!CHATGPT_API_KEY) {
    return { success: false, error: 'CHATGPT_API_KEY or NEXT_PUBLIC_CHATGPT_API_KEY environment variable is required for API route. Please set it in your environment or .env file.' };
  }

  return await callStoreMemoryAPI(API_URL, CHATGPT_API_KEY, content, userEmail);
}

async function callStoreMemoryAPI(apiUrl: string, apiKey: string, content: string, userEmail: string): Promise<{ success: boolean; memory_id?: string; error?: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/chatgpt/store-memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-api-key': apiKey,
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
  console.log('📋 Storing PRD as Memory for joven.ong23@gmail.com');
  console.log('');

  const userEmail = 'joven.ong23@gmail.com';

  // Read the PRD file (tesy)
  const prdPath = join(process.cwd(), 'tesy');
  let prdContent = '';
  try {
    prdContent = readFileSync(prdPath, 'utf-8');
    console.log(`✅ Read PRD file (${prdContent.length} characters, ${prdContent.split('\n').length} lines)`);
  } catch (error: any) {
    console.error(`❌ Failed to read PRD file: ${error.message}`);
    process.exit(1);
  }

  // Read additional design system files
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

  // Compile comprehensive design system memory with full PRD
  // Note: Firestore has 1MB limit per document, so we'll include full PRD but truncate CSS if needed
  const designSystemMemory = `# Pandora's Box - Complete Product Requirements Document & Design System

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
${globalsCss.substring(0, 5000)}${globalsCss.length > 5000 ? '...' : ''}

## Key Design Elements Summary

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
- PRD: tesy (root directory, ${prdContent.split('\n').length} lines)
- Tailwind Config: tailwind.config.ts
- Global Styles: src/app/globals.css
- Components: src/components/
- App Pages: src/app/(pandora-ui)/

## Implementation Notes
- All design tokens are in globals.css (CSS variables)
- Tailwind config extends base design system
- Components use shadcn/ui as base, customized with brand styling
- Brand colors: Primary (cyan #00E5FF), Secondary (violet #A78BFA)
- All interactive elements should have neon glow on hover/active
- Glass panels use: backdrop-blur-xl, bg-card/40, border-primary/20
- Neon glows use: box-shadow with rgba(0, 229, 255, 0.3) for cyan, rgba(167, 139, 250, 0.3) for violet`;

  // Store the memory directly using Firebase Admin
  console.log('');
  console.log('💾 Storing PRD and design system memory...');
  const result = await storeMemoryDirectly(designSystemMemory, userEmail);

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
      dedupeKey: `prd-design-system-memory:${memoryId}`,
      source: 'design',
      action: 'memory.created',
      status: 'ok',
      module: 'design-system',
      refType: 'memory',
      refId: memoryId,
      tags: ['design-system', 'prd', 'memory', 'joven.ong23@gmail.com', 'complete-prd'],
      metadata: {
        title: 'PRD and Design System Memory Created',
        memoryId: memoryId,
        userEmail: userEmail,
        documentType: 'prd-and-design-system',
        includesPRD: true,
        includesDesignSystem: true,
        prdLength: prdContent.length,
        prdLines: prdContent.split('\n').length,
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

