import { NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  const startTime = Date.now();
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const collectionName = process.env.QDRANT_COLLECTION || 'memories';
  
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: {
      QDRANT_URL: process.env.QDRANT_URL ? 'set' : 'not set (using default)',
      QDRANT_COLLECTION: process.env.QDRANT_COLLECTION || 'memories (default)'
    },
    targetUrl: qdrantUrl,
    checks: []
  };
  
  try {
    diagnostics.checks.push({ step: 'fetch_start', timestamp: Date.now() - startTime });
    
    // Test basic connectivity
    const res = await fetch(`${qdrantUrl}/collections`, {
      signal: AbortSignal.timeout(10000)
    });
    
    diagnostics.checks.push({ 
      step: 'fetch_complete', 
      status: res.status, 
      duration_ms: Date.now() - startTime 
    });
    
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const collections = data.result?.collections || [];
      const collectionNames = collections.map((c: any) => c.name);
      
      // Check if our target collection exists
      const hasMemoriesCollection = collectionNames.includes(collectionName);
      
      // Get collection info if it exists
      let collectionInfo = null;
      if (hasMemoriesCollection) {
        try {
          const infoRes = await fetch(`${qdrantUrl}/collections/${collectionName}`);
          if (infoRes.ok) {
            const info = await infoRes.json();
            collectionInfo = {
              points_count: info.result?.points_count,
              vectors_count: info.result?.vectors_count,
              status: info.result?.status
            };
          }
        } catch (e) {
          // Ignore collection info errors
        }
      }
      
      return NextResponse.json({ 
        status: 'online', 
        service: 'Qdrant',
        collections: collectionNames,
        targetCollection: collectionName,
        targetCollectionExists: hasMemoriesCollection,
        collectionInfo,
        latency_ms: Date.now() - startTime,
        url: qdrantUrl
      }, { headers: corsHeaders() });
    }
    
    return NextResponse.json({ 
      status: 'offline', 
      error: `Qdrant returned status: ${res.status}`,
      diagnostics
    }, { status: 503, headers: corsHeaders() });
    
  } catch (error: any) {
    // Determine error type for better debugging
    let errorType = 'unknown';
    let suggestion = '';
    
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      errorType = 'timeout';
      suggestion = 'Request timed out after 10s. Check if Qdrant VM is running and VPC connector is attached.';
    } else if (error.cause?.code === 'ECONNREFUSED') {
      errorType = 'connection_refused';
      suggestion = 'Connection refused. Qdrant may not be running on the VM (check Docker container).';
    } else if (error.cause?.code === 'ENETUNREACH' || error.cause?.code === 'EHOSTUNREACH') {
      errorType = 'network_unreachable';
      suggestion = 'Network unreachable. VPC connector may not be attached or VM is on wrong network.';
    }
    
    diagnostics.checks.push({ 
      step: 'fetch_error', 
      errorType,
      errorName: error.name,
      errorMessage: error.message,
      errorCause: error.cause?.code || error.cause,
      duration_ms: Date.now() - startTime
    });
    
    console.error(`[Health Check] Qdrant Connection Error to ${qdrantUrl}:`, {
      errorType,
      message: error.message,
      cause: error.cause,
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json({ 
      status: 'offline', 
      error: `Connection failed: ${errorType}`,
      suggestion,
      diagnostics
    }, { status: 503, headers: corsHeaders() });
  }
}
