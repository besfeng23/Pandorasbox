import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { getServerConfig } from '@/server/config';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    const config = await getServerConfig();
    // Ensure /v1 is appended for OpenAI-compatible API
    let inferenceUrl: string;
    if (config.inferenceBaseUrl.endsWith('/v1')) {
      inferenceUrl = config.inferenceBaseUrl;
    } else {
      inferenceUrl = `${config.inferenceBaseUrl}/v1`;
    }

    // Try /models endpoint (OpenAI-compatible)
    const res = await fetch(`${inferenceUrl}/models`, { 
      signal: AbortSignal.timeout(2000),
      headers: {
        'Authorization': `Bearer ${process.env.SOVEREIGN_KEY || 'empty'}`
      }
    });
    
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      // Detect service type based on port or response
      const serviceType = inferenceUrl.includes('11434') ? 'Ollama' : 'vLLM';
      return NextResponse.json({ 
        status: 'online', 
        service: serviceType,
        models: data.data || data.models || []
      }, { headers: corsHeaders() });
    }
    
    // If 404, try Ollama's native API endpoint
    if (res.status === 404 && inferenceUrl.includes('11434')) {
      const ollamaUrl = inferenceUrl.replace('/v1', '/api/tags');
      const altRes = await fetch(ollamaUrl, { signal: AbortSignal.timeout(2000) });
      if (altRes.ok) {
        return NextResponse.json({ status: 'online', service: 'Ollama' }, { headers: corsHeaders() });
      }
    }
    
    return NextResponse.json({ 
      status: 'offline', 
      error: `Inference service returned status: ${res.status}` 
    }, { status: 503, headers: corsHeaders() });
  } catch (error: any) {
    console.error(`[Health Check] Inference Connection Error:`, error.message, error.cause || '');
    return NextResponse.json({ 
      status: 'offline', 
      error: `Connection failed: ${error.message}. Check service and VPC connector.` 
    }, { status: 503, headers: corsHeaders() });
  }
}

