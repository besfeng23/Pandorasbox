import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { getServerConfig } from '@/server/config';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  const startTime = Date.now();
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    checks: []
  };

  try {
    const config = await getServerConfig();
    
    // Log environment for debugging
    diagnostics.environment = {
      UNIVERSE_INFERENCE_URL: process.env.UNIVERSE_INFERENCE_URL ? 'set' : 'not set',
      INFERENCE_URL: process.env.INFERENCE_URL ? 'set' : 'not set',
      INFERENCE_BASE_URL: process.env.INFERENCE_BASE_URL ? 'set' : 'not set',
      resolvedUrl: config.inferenceBaseUrl,
      resolvedModel: config.inferenceModel
    };

    // Ensure /v1 is appended for OpenAI-compatible API
    let inferenceUrl: string;
    if (config.inferenceBaseUrl.endsWith('/v1')) {
      inferenceUrl = config.inferenceBaseUrl;
    } else {
      inferenceUrl = `${config.inferenceBaseUrl}/v1`;
    }
    
    diagnostics.targetUrl = inferenceUrl;
    diagnostics.checks.push({ step: 'config_loaded', status: 'ok', url: inferenceUrl });

    // Try /models endpoint (OpenAI-compatible)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      diagnostics.checks.push({ step: 'fetch_start', timestamp: Date.now() - startTime });
      
      const res = await fetch(`${inferenceUrl}/models`, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${process.env.SOVEREIGN_KEY || 'empty'}`
        }
      });
      
      clearTimeout(timeoutId);
      diagnostics.checks.push({ 
        step: 'fetch_complete', 
        status: res.status, 
        duration_ms: Date.now() - startTime 
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const serviceType = inferenceUrl.includes('11434') ? 'Ollama' : 'vLLM';
        
        return NextResponse.json({
          status: 'online',
          service: serviceType,
          models: data.data || data.models || [],
          latency_ms: Date.now() - startTime,
          url: inferenceUrl
        }, { headers: corsHeaders() });
      }

      // If 404, try Ollama's native API endpoint
      if (res.status === 404 && inferenceUrl.includes('11434')) {
        diagnostics.checks.push({ step: 'trying_ollama_native', reason: '404 on /v1/models' });
        
        const ollamaUrl = inferenceUrl.replace('/v1', '/api/tags');
        const altRes = await fetch(ollamaUrl, { signal: AbortSignal.timeout(10000) });
        
        if (altRes.ok) {
          const ollamaData = await altRes.json().catch(() => ({}));
          return NextResponse.json({ 
            status: 'online', 
            service: 'Ollama',
            models: ollamaData.models?.map((m: any) => m.name) || [],
            latency_ms: Date.now() - startTime,
            url: ollamaUrl
          }, { headers: corsHeaders() });
        }
      }

      // If we get here, the service responded but with an error
      const errorText = await res.text().catch(() => '');
      return NextResponse.json({
        status: 'offline',
        error: `Inference service returned status: ${res.status}`,
        details: errorText.substring(0, 200),
        diagnostics
      }, { status: 503, headers: corsHeaders() });
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Determine error type for better debugging
      let errorType = 'unknown';
      let suggestion = '';
      
      if (fetchError.name === 'AbortError') {
        errorType = 'timeout';
        suggestion = 'Request timed out after 10s. Check if VM is running and VPC connector is attached.';
      } else if (fetchError.cause?.code === 'ECONNREFUSED') {
        errorType = 'connection_refused';
        suggestion = 'Connection refused. The Ollama/vLLM service may not be running on the VM.';
      } else if (fetchError.cause?.code === 'ENOTFOUND' || fetchError.cause?.code === 'EAI_AGAIN') {
        errorType = 'dns_failure';
        suggestion = 'DNS resolution failed. Check the hostname in INFERENCE_URL.';
      } else if (fetchError.cause?.code === 'ENETUNREACH' || fetchError.cause?.code === 'EHOSTUNREACH') {
        errorType = 'network_unreachable';
        suggestion = 'Network unreachable. VPC connector may not be attached or VM is on wrong network.';
      } else if (fetchError.message?.includes('fetch failed')) {
        errorType = 'fetch_failed';
        suggestion = 'Generic fetch failure. Check Cloud Run logs for more details.';
      }
      
      diagnostics.checks.push({ 
        step: 'fetch_error', 
        errorType,
        errorName: fetchError.name,
        errorMessage: fetchError.message,
        errorCause: fetchError.cause?.code || fetchError.cause,
        duration_ms: Date.now() - startTime
      });
      
      console.error(`[Health Check] Inference Connection Error:`, {
        errorType,
        message: fetchError.message,
        cause: fetchError.cause,
        targetUrl: inferenceUrl,
        duration_ms: Date.now() - startTime
      });
      
      return NextResponse.json({
        status: 'offline',
        error: `Connection failed: ${errorType}`,
        suggestion,
        diagnostics
      }, { status: 503, headers: corsHeaders() });
    }
    
  } catch (error: any) {
    console.error(`[Health Check] Unexpected Error:`, error);
    
    return NextResponse.json({
      status: 'offline',
      error: `Unexpected error: ${error.message}`,
      diagnostics
    }, { status: 503, headers: corsHeaders() });
  }
}
