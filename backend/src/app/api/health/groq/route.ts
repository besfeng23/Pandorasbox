import { NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  const startTime = Date.now();
  const groqApiKey = process.env.GROQ_API_KEY;
  
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: {
      GROQ_API_KEY: groqApiKey ? `set (${groqApiKey.substring(0, 8)}...)` : 'NOT SET',
      BUILDER_MODEL: process.env.BUILDER_MODEL || 'llama-3.3-70b-versatile (default)',
      REFLEX_MODEL: process.env.REFLEX_MODEL || 'llama-3.1-8b-instant (default)',
    }
  };
  
  if (!groqApiKey) {
    return NextResponse.json({
      status: 'offline',
      error: 'GROQ_API_KEY not configured',
      suggestion: 'Add groq-api-key secret to Google Secret Manager and redeploy',
      diagnostics
    }, { status: 503, headers: corsHeaders() });
  }
  
  try {
    // Test the Groq API
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      const data = await response.json();
      const models = data.data?.map((m: any) => m.id) || [];
      
      return NextResponse.json({
        status: 'online',
        service: 'Groq',
        models: models.slice(0, 10), // First 10 models
        latency_ms: Date.now() - startTime,
        diagnostics
      }, { headers: corsHeaders() });
    }
    
    if (response.status === 401) {
      return NextResponse.json({
        status: 'offline',
        error: 'Invalid API Key (401)',
        suggestion: 'The GROQ_API_KEY is set but invalid. Please update the secret.',
        diagnostics
      }, { status: 503, headers: corsHeaders() });
    }
    
    return NextResponse.json({
      status: 'offline',
      error: `Groq API returned status: ${response.status}`,
      diagnostics
    }, { status: 503, headers: corsHeaders() });
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'offline',
      error: `Connection failed: ${error.message}`,
      diagnostics
    }, { status: 503, headers: corsHeaders() });
  }
}
