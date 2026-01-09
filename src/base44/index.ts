/**
 * Base44 - Unified Gateway Layer
 * Phase 15: Unified Gateway Layer (Base44)
 * 
 * Middleware integration for API gateway functionality.
 * Provides unified routing, authentication, rate limiting, and request/response transformation.
 */

import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Base44 Logger
 * Auto-creates logs directory and provides structured logging
 */
class Base44Logger {
  private logDir: string;

  constructor() {
    this.logDir = logsDir;
  }

  private getLogFileName(type: 'info' | 'error' | 'warn' | 'debug'): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `base44-${type}-${date}.log`);
  }

  private writeLog(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
    };

    const logFile = this.getLogFileName(level as any);
    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error(`Failed to write log to ${logFile}:`, error);
    }
  }

  info(message: string, data?: any): void {
    console.log(`[Base44] ${message}`, data || '');
    this.writeLog('info', message, data);
  }

  error(message: string, error?: any): void {
    console.error(`[Base44] ERROR: ${message}`, error || '');
    this.writeLog('error', message, error);
  }

  warn(message: string, data?: any): void {
    console.warn(`[Base44] WARN: ${message}`, data || '');
    this.writeLog('warn', message, data);
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Base44] DEBUG: ${message}`, data || '');
      this.writeLog('debug', message, data);
    }
  }
}

/**
 * Base44 Gateway Configuration
 */
export interface Base44Config {
  enabled: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  authentication?: {
    required: boolean;
    providers: string[];
  };
  cors?: {
    allowedOrigins: string[];
    allowedMethods: string[];
  };
  logging?: {
    level: 'info' | 'error' | 'warn' | 'debug';
    enabled: boolean;
  };
}

/**
 * Base44 Gateway Class
 * Main gateway middleware orchestrator
 */
export class Base44Gateway {
  private logger: Base44Logger;
  private config: Base44Config;

  constructor(config: Base44Config) {
    this.logger = new Base44Logger();
    this.config = config;
    this.logger.info('Base44 Gateway initialized', { config: this.config });
  }

  /**
   * Process incoming request through gateway middleware chain
   */
  async processRequest(
    request: Request,
    context?: any
  ): Promise<Response | null> {
    try {
      this.logger.debug('Processing request', {
        url: request.url,
        method: request.method,
      });

      // Authentication middleware
      if (this.config.authentication?.required) {
        const authResult = await this.authenticate(request);
        if (!authResult) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401 }
          );
        }
      }

      // Rate limiting middleware
      if (this.config.rateLimit) {
        const rateLimitResult = await this.checkRateLimit(request);
        if (!rateLimitResult) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded' }),
            { status: 429 }
          );
        }
      }

      // CORS middleware
      if (this.config.cors) {
        const corsHeaders = this.getCorsHeaders(request);
        // CORS headers will be added to response
      }

      this.logger.info('Request processed successfully', {
        url: request.url,
        method: request.method,
      });

      return null; // Continue to next handler
    } catch (error: any) {
      this.logger.error('Error processing request', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500 }
      );
    }
  }

  /**
   * Authenticate request
   */
  private async authenticate(request: Request): Promise<boolean> {
    // TODO: Implement authentication logic
    // Check for auth headers, tokens, etc.
    const authHeader = request.headers.get('Authorization');
    return !!authHeader;
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(request: Request): Promise<boolean> {
    // TODO: Implement rate limiting logic
    // Use in-memory store or Redis for rate limiting
    return true;
  }

  /**
   * Get CORS headers
   */
  private getCorsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('Origin');
    const headers: Record<string, string> = {};

    if (
      this.config.cors?.allowedOrigins.includes(origin || '') ||
      this.config.cors?.allowedOrigins.includes('*')
    ) {
      headers['Access-Control-Allow-Origin'] = origin || '*';
      headers['Access-Control-Allow-Methods'] =
        this.config.cors.allowedMethods.join(', ');
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    }

    return headers;
  }

  /**
   * Transform request/response
   */
  transformRequest(request: Request): Request {
    // TODO: Implement request transformation
    return request;
  }

  transformResponse(response: Response): Response {
    // TODO: Implement response transformation
    return response;
  }
}

/**
 * Default Base44 configuration
 */
export const defaultBase44Config: Base44Config = {
  enabled: true,
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  },
  authentication: {
    required: false,
    providers: ['firebase', 'github'],
  },
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
  logging: {
    level: 'info',
    enabled: true,
  },
};

/**
 * Create Base44 Gateway instance
 */
export function createBase44Gateway(
  config?: Partial<Base44Config>
): Base44Gateway {
  const mergedConfig = {
    ...defaultBase44Config,
    ...config,
  };
  return new Base44Gateway(mergedConfig);
}

/**
 * Export logger for direct use
 */
export const base44Logger = new Base44Logger();

