import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { chatCompletion } from '@/server/inference-client';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * Analyze Firestore schema to understand available collections and fields
 */
async function analyzeSchema() {
  const db = getFirestoreAdmin();
  const collections = [
    'threads', 'history', 'memories', 'artifacts', 'settings',
    'users', 'workspaces', 'analytics', 'feedback'
  ];
  
  const schema: Record<string, any> = {};
  
  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).limit(3).get();
      if (!snapshot.empty) {
        const sample = snapshot.docs[0].data();
        schema[collectionName] = {
          fields: Object.keys(sample),
          sample: sample,
        };
      }
    } catch (error) {
      // Collection might not exist or be accessible
    }
  }
  
  return schema;
}

/**
 * Generate React component code from a prompt
 * Uses local vLLM to generate component code
 */
async function generateComponentFromPrompt(prompt: string, schema: any) {
  const systemPrompt = `You are a React/Next.js component generator for a Firebase-based application.

Available Firestore Collections and their schemas:
${JSON.stringify(schema, null, 2)}

Your task is to generate a complete, production-ready React component that:
1. Uses TypeScript and Next.js App Router ('use client' directive)
2. Follows the design system (Apple-esque, clean, using Tailwind CSS)
3. Auto-binds to the Firestore backend via API routes
4. Uses shadcn/ui components (Card, Button, Input, Badge, etc.)
5. Implements proper error handling and loading states
6. Uses the user's prompt to determine what UI to create

Generate ONLY the component code, no explanations. The component should be ready to use.

Design System Guidelines:
- Use shadow-card-light for cards
- Border radius: 12px default, 16px for prominent cards
- Spacing: 8pt system (8, 16, 24, 32px)
- Font: Inter with system fallback
- Colors: Use CSS variables (--background, --foreground, etc.)
- Animations: Use transition-small (150ms) or transition-panel (280ms)

API Routes Available:
- GET /api/studio/collections - List collections
- GET /api/studio/collections/[collection] - Get documents
- POST /api/studio/collections/[collection] - Create document
- PATCH /api/studio/collections/[collection]/[id] - Update document
- DELETE /api/studio/collections/[collection]/[id] - Delete document

Import paths should use @/components/ui/* and @/hooks/*

Generate a complete component file that can be saved and used immediately.`;

  try {
    const response = await chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const generatedCode = response.choices[0]?.message?.content || '';
    
    // Extract code block if present
    const codeMatch = generatedCode.match(/```(?:tsx|ts|jsx|js)?\n([\s\S]*?)```/);
    return codeMatch ? codeMatch[1] : generatedCode;
  } catch (error) {
    console.error('Error generating component:', error);
    throw error;
  }
}

/**
 * POST /api/studio/generate
 * Generate a React component from a natural language prompt
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt, componentName } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Analyze current schema
    const schema = await analyzeSchema();
    
    // Generate component code
    const componentCode = await generateComponentFromPrompt(prompt, schema);
    
    // Extract imports and component structure
    const imports = componentCode.match(/^import[\s\S]*?from[\s\S]*?;$/gm)?.join('\n') || '';
    const componentMatch = componentCode.match(/(export\s+(?:default\s+)?(?:function|const)\s+\w+[\s\S]*)/);
    const componentBody = componentMatch ? componentMatch[1] : componentCode;
    
    return NextResponse.json({
      success: true,
      componentName: componentName || 'GeneratedComponent',
      code: componentCode,
      imports,
      component: componentBody,
      schema: Object.keys(schema),
    }, { headers: corsHeaders() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Generate component error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

