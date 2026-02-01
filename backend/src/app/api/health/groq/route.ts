import { NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  const startTime = Date.now();
  const apiKey = process.env.GROQ_API_KEY;
  
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: {
      GROQ_API_KEY: apiKey ? `set (${apiKey.length} chars, starts with ${apiKey.substring(0, 8)}...)` : 'NOT SET',
      BUILDER_MODEL: process.env.BUILDER_MODEL || 'not set (default: llama-3.3-70b-versatile)',
      REFLEX_MODEL: process.env.REFLEX_MODEL || 'not set (default: llama-3.1-8b-instant)',
    },
    checks: []
  };

  if (!apiKey) {
    return NextResponse.json({
      status: 'offline',
      error: 'GROQ_API_KEY environment variable is not set',
      suggestion: 'Ensure the groq-api-key secret exists in Google Secret Manager and is referenced in apphosting.yaml',
      diagnostics
    }, { status: 503, headers: corsHeaders() });
  }

  try {
    diagnostics.checks.push({ step: 'initializing_client', timestamp: Date.now() - startTime });
    
    const groq = new Groq({ apiKey });
    
    diagnostics.checks.push({ step: 'listing_models', timestamp: Date.now() - startTime });
    
    // Test by listing models
    const models = await groq.models.list();
    
    diagnostics.checks.push({ 
      step: 'models_listed', 
      count: models.data?.length || 0,
      timestamp: Date.now() - startTime 
    });

    return NextResponse.json({
      status: 'online',
      service: 'Groq',
      models: models.data?.slice(0, 5).map(m => m.id) || [],
      latency_ms: Date.now() - startTime,
      diagnostics
    }, { headers: corsHeaders() });

  } catch (error: any) {
    diagnostics.checks.push({ 
      step: 'error', 
      errorMessage: error.message,
      errorStatus: error.status,
      timestamp: Date.now() - startTime 
    });

    let suggestion = 'Check the Groq API key is valid at https://console.groq.com/keys';
    
    if (error.status === 401) {
      suggestion = 'The API key is invalid or expired. Generate a new key at https://console.groq.com/keys';
    }

    return NextResponse.json({
      status: 'offline',
      error: `Groq API error: ${error.message}`,
      suggestion,
      diagnostics
    }, { status: 503, headers: corsHeaders() });
  }
}
