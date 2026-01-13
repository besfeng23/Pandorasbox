import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';
import { Firestore } from '@google-cloud/firestore';

const GATEWAY_URL = process.env.KAIROS_EVENT_GATEWAY_URL || 'https://kairos-event-gateway-axypi7xsha-as.a.run.app';
const GOOGLE_ID_TOKEN = process.env.GOOGLE_ID_TOKEN;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'seismic-vista-480710-q5';

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

async function getUserIdFromFirestore(userEmail: string, providedUserId?: string): Promise<string | null> {
  // If user ID is provided, use it
  if (providedUserId) {
    console.log(`✅ Using provided user ID: ${providedUserId}`);
    return providedUserId;
  }
  
  try {
    const firestore = new Firestore({ projectId: PROJECT_ID });
    
    // Try to find user ID from existing memories
    const memoriesSnapshot = await firestore
      .collection('memories')
      .where('metadata.userEmail', '==', userEmail)
      .limit(1)
      .get();
    
    if (!memoriesSnapshot.empty) {
      const memoryData = memoriesSnapshot.docs[0].data();
      const foundUserId = memoryData.userId || null;
      if (foundUserId) {
        console.log(`⚠️  Found user ID from existing memory: ${foundUserId}`);
        console.log(`⚠️  WARNING: This may not be the correct user ID for ${userEmail}`);
        console.log(`⚠️  Please verify or provide the correct user ID via USER_ID environment variable`);
        return foundUserId;
      }
    }
    
    return null;
  } catch (error: any) {
    console.error(`❌ Error querying Firestore: ${error.message}`);
    return null;
  }
}

async function storeMemoryDirectly(content: string, userEmail: string, userId: string): Promise<{ success: boolean; memory_id?: string; error?: string }> {
  try {
    const firestore = new Firestore({ projectId: PROJECT_ID });
    // Import embedding generation function from vector.ts
    const { generateEmbedding } = await import('../src/lib/vector');
    const { updateKnowledgeGraphFromMemory } = await import('../src/lib/knowledge-graph');
    
    // Generate embedding
    console.log('📊 Generating embedding...');
    const embedding = await generateEmbedding(content);
    
    // Create memory document
    console.log('💾 Saving to Firestore...');
    const memoryRef = await firestore.collection('memories').add({
      id: '', // Will be set after creation
      content: content.trim(),
      embedding: embedding,
      createdAt: new Date(),
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
    
    // Update with the ID
    await memoryRef.update({ id: memoryRef.id });
    
    // Update knowledge graph
    try {
      await updateKnowledgeGraphFromMemory({
        userId: userId,
        memoryId: memoryRef.id,
        content: content.trim(),
      });
    } catch (error: any) {
      console.warn(`⚠️  Knowledge graph update failed: ${error.message}`);
    }
    
    return { success: true, memory_id: memoryRef.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
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

  // Create a concise design system memory that fits within token limits
  // Extract key sections from PRD (first 25,000 chars covers most important sections)
  const prdKeySections = prdContent.substring(0, 25000);
  
  const designSystemMemory = `# Pandora's Box - Product Requirements Document & Design System

## PRD Key Sections (Full PRD: 79,914 chars, 2,199 lines in tesy file)

${prdKeySections}

[... Full PRD continues in tesy file. This memory contains key sections: Product Intent, User Personas, Core Workflows, Data Model, Design Requirements ...]

## Design System Specifications

### Brand Colors
- Primary (Cyan): #00E5FF (HSL: 190 100% 55%)
- Secondary (Violet): #A78BFA (HSL: 262 83% 62%)
- Background: hsl(222, 18%, 6%) to hsl(222, 18%, 8%) gradient
- Card: hsl(222, 18%, 10%)
- Foreground: hsl(210, 20%, 98%)

### Tailwind Config (Key Settings)
${tailwindConfig.substring(0, 1000)}${tailwindConfig.length > 1000 ? '...' : ''}

### Global CSS (Key Variables)
${globalsCss.substring(0, 1500)}${globalsCss.length > 1500 ? '...' : ''}

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

  // Get user ID - check environment variable first, then Firestore
  console.log('');
  const providedUserId = process.env.USER_ID;
  if (providedUserId) {
    console.log(`✅ Using user ID from USER_ID environment variable: ${providedUserId}`);
  } else {
    console.log('🔍 Looking up user ID from Firestore...');
    console.log('   (Set USER_ID environment variable to specify the correct user ID)');
  }
  
  const userId = await getUserIdFromFirestore(userEmail, providedUserId);
  
  if (!userId) {
    console.error('');
    console.error('❌ Could not find user ID.');
    console.error('   Please provide the correct user ID by setting USER_ID environment variable:');
    console.error('   $env:USER_ID="correct-user-id-here"');
    console.error('   Or get it from Firebase Console:');
    console.error('   https://console.firebase.google.com/project/seismic-vista-480710-q5/authentication/users');
    process.exit(1);
  }
  
  console.log(`✅ Using user ID: ${userId}`);
  console.log('');

  // Store the memory directly
  console.log('💾 Storing PRD and design system memory...');
  const result = await storeMemoryDirectly(designSystemMemory, userEmail, userId);

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
        userId: userId,
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
  console.log(`🆔 User ID: ${userId}`);
  console.log(`📊 Check Kairos: https://kairostrack.base44.app`);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

