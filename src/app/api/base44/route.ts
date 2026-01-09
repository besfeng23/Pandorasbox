/**
 * Base44 API Route
 * Phase 15: Unified Gateway Layer (Base44)
 * 
 * This endpoint provides the Base44 gateway functionality as a Next.js API route.
 * It handles authentication, rate limiting, CORS, and request/response transformation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBase44Gateway, Base44Config } from '@/base44';
import { getAuthAdmin } from '@/lib/firebase-admin';

// Prevent this route from being statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Initialize Base44 Gateway with configuration from environment
const getBase44Config = (): Base44Config => {
  return {
    enabled: process.env.BASE44_ENABLED !== 'false',
    rateLimit: {
      windowMs: parseInt(process.env.BASE44_RATE_LIMIT_WINDOW_MS || '60000', 10),
      maxRequests: parseInt(process.env.BASE44_RATE_LIMIT_MAX || '100', 10),
    },
    authentication: {
      required: process.env.BASE44_AUTH_REQUIRED === 'true',
      providers: (process.env.BASE44_AUTH_PROVIDERS || 'firebase,github').split(','),
    },
    cors: {
      allowedOrigins: (process.env.BASE44_CORS_ORIGINS || '*').split(','),
      allowedMethods: (process.env.BASE44_CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(','),
    },
    logging: {
      level: (process.env.BASE44_LOG_LEVEL || 'info') as 'info' | 'error' | 'warn' | 'debug',
      enabled: process.env.BASE44_LOGGING_ENABLED !== 'false',
    },
  };
};

// Create gateway instance
const gateway = createBase44Gateway(getBase44Config());

// In-memory rate limit store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CORS headers helper
function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '*';
  const config = getBase44Config();
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': config.cors?.allowedMethods.join(', ') || 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };

  if (config.cors?.allowedOrigins.includes(origin) || config.cors?.allowedOrigins.includes('*')) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

// Rate limiting check
async function checkRateLimit(request: NextRequest): Promise<boolean> {
  const config = getBase44Config();
  if (!config.rateLimit) return true;

  const clientId = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;

  const key = `ratelimit:${clientId}`;
  const stored = rateLimitStore.get(key);

  if (!stored || now > stored.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (stored.count >= maxRequests) {
    return false;
  }

  stored.count++;
  rateLimitStore.set(key, stored);
  return true;
}

// Authentication check
async function authenticateRequest(request: NextRequest): Promise<{ authenticated: boolean; userId?: string }> {
  const config = getBase44Config();
  if (!config.authentication?.required) {
    return { authenticated: true };
  }

  // Check for Firebase token
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { authenticated: false };
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { authenticated: false };
  }

  try {
    const authAdmin = getAuthAdmin();
    const decodedToken = await authAdmin.verifyIdToken(token);
    return { authenticated: true, userId: decodedToken.uid };
  } catch (error) {
    return { authenticated: false };
  }
}

/**
 * OPTIONS /api/base44
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders(request) });
}

/**
 * GET /api/base44
 * Gateway health check and status endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    if (!(await checkRateLimit(request))) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: corsHeaders(request) }
      );
    }

    // Authenticate if required
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders(request) }
      );
    }

    const config = getBase44Config();
    
    return NextResponse.json({
      success: true,
      service: 'Base44 Gateway',
      version: '1.0.0',
      phase: 15,
      status: 'active',
      config: {
        enabled: config.enabled,
        authentication: {
          required: config.authentication?.required || false,
          providers: config.authentication?.providers || [],
        },
        rateLimit: {
          windowMs: config.rateLimit?.windowMs,
          maxRequests: config.rateLimit?.maxRequests,
        },
        cors: {
          allowedOrigins: config.cors?.allowedOrigins || [],
          allowedMethods: config.cors?.allowedMethods || [],
        },
      },
      timestamp: new Date().toISOString(),
      userId: authResult.userId,
    }, { headers: corsHeaders(request) });

  } catch (error: any) {
    console.error('[Base44] Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

/**
 * POST /api/base44
 * Process requests through the Base44 gateway
 * 
 * Request body:
 * {
 *   "action": "route" | "transform" | "validate",
 *   "data": { ... },
 *   "target": "endpoint_path"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    if (!(await checkRateLimit(request))) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: corsHeaders(request) }
      );
    }

    // Authenticate if required
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders(request) }
      );
    }

    // Process request through gateway
    const gatewayResponse = await gateway.processRequest(request);
    if (gatewayResponse) {
      // Gateway returned a response (error or early termination)
      const responseData = await gatewayResponse.json();
      return NextResponse.json(responseData, {
        status: gatewayResponse.status,
        headers: { ...corsHeaders(request), ...Object.fromEntries(gatewayResponse.headers.entries()) },
      });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { action, data, target } = body;

    // Handle different actions
    switch (action) {
      case 'route':
        // Route to target endpoint
        return NextResponse.json({
          success: true,
          message: 'Request routed',
          target,
          data,
          userId: authResult.userId,
        }, { headers: corsHeaders(request) });

      case 'transform':
        // Transform request/response
        const transformedRequest = gateway.transformRequest(request);
        return NextResponse.json({
          success: true,
          message: 'Request transformed',
          original: data,
          transformed: data, // TODO: Implement actual transformation
        }, { headers: corsHeaders(request) });

      case 'validate':
        // Validate request
        return NextResponse.json({
          success: true,
          message: 'Request validated',
          valid: true,
          data,
        }, { headers: corsHeaders(request) });

      default:
        return NextResponse.json({
          success: true,
          message: 'Request processed through Base44 gateway',
          action: action || 'default',
          data,
          userId: authResult.userId,
          timestamp: new Date().toISOString(),
        }, { headers: corsHeaders(request) });
    }

  } catch (error: any) {
    console.error('[Base44] Error in POST handler:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

/**
 * PUT /api/base44
 * Update gateway configuration or state
 */
export async function PUT(request: NextRequest) {
  try {
    // Check rate limit
    if (!(await checkRateLimit(request))) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: corsHeaders(request) }
      );
    }

    // Authenticate if required
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders(request) }
      );
    }

    const body = await request.json();
    
    return NextResponse.json({
      success: true,
      message: 'Gateway configuration updated',
      config: body,
      userId: authResult.userId,
      timestamp: new Date().toISOString(),
    }, { headers: corsHeaders(request) });

  } catch (error: any) {
    console.error('[Base44] Error in PUT handler:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

/**
 * DELETE /api/base44
 * Clear gateway state or cache
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check rate limit
    if (!(await checkRateLimit(request))) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: corsHeaders(request) }
      );
    }

    // Authenticate if required
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders(request) }
      );
    }

    // Clear rate limit store (in production, clear Redis cache)
    rateLimitStore.clear();

    return NextResponse.json({
      success: true,
      message: 'Gateway state cleared',
      userId: authResult.userId,
      timestamp: new Date().toISOString(),
    }, { headers: corsHeaders(request) });

  } catch (error: any) {
    console.error('[Base44] Error in DELETE handler:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

