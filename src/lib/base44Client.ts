/**
 * Base44 Client
 * Single place for all Base44 API calls.
 * Communicates with the Base44 gateway at /api/base44
 */

interface Base44Request {
  action?: 'route' | 'transform' | 'validate' | 'chat';
  data?: any;
  target?: string;
  message?: string;
  sessionId?: string;
  user?: string;
}

interface Base44Response {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  details?: string;
}

class Base44Client {
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    this.apiKey = process.env.NEXT_PUBLIC_BASE44_API_KEY;
  }

  /**
   * Get authentication headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add API key if available
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    // Add Firebase auth token if available (from client-side auth)
    if (typeof window !== 'undefined') {
      // Try to get Firebase auth token from localStorage or auth state
      // This would need to be integrated with your Firebase auth
      const token = localStorage.getItem('firebase_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Make a request to Base44 API
   */
  private async request(
    method: string,
    body?: Base44Request
  ): Promise<Base44Response> {
    try {
      const response = await fetch(`${this.baseUrl}/api/base44`, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          success: false,
          error: error.error || `HTTP ${response.status}`,
          details: error.details,
        };
      }

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: 'Network error',
        details: error.message,
      };
    }
  }

  /**
   * Health check - verify Base44 gateway is available
   */
  async healthCheck(): Promise<Base44Response> {
    return this.request('GET');
  }

  /**
   * Send chat message through Base44 gateway
   */
  async chatCompletion(
    message: string,
    sessionId: string = 'pandora-session',
    user: string = 'operator'
  ): Promise<string> {
    const response = await this.request('POST', {
      action: 'chat',
      message,
      sessionId,
      user,
    });

    if (!response.success) {
      return `⚠️ ${response.error || 'Connection issue'}`;
    }

    // Extract response from various possible formats
    return response.data?.response || 
           response.data?.message || 
           response.message || 
           '...';
  }

  /**
   * Route request to target endpoint
   */
  async route(target: string, data: any): Promise<Base44Response> {
    return this.request('POST', {
      action: 'route',
      target,
      data,
    });
  }

  /**
   * Transform request/response
   */
  async transform(data: any): Promise<Base44Response> {
    return this.request('POST', {
      action: 'transform',
      data,
    });
  }

  /**
   * Validate request
   */
  async validate(data: any): Promise<Base44Response> {
    return this.request('POST', {
      action: 'validate',
      data,
    });
  }
}

// Export singleton instance
export const base44 = new Base44Client();

