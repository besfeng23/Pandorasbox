// Mock Genkit/Firebase telemetry BEFORE any imports to prevent open handles
// This prevents @genkit-ai/firebase from initializing telemetry in tests
jest.mock('@genkit-ai/firebase', () => ({
  enableFirebaseTelemetry: jest.fn(() => {}),
}));

// Mock Genkit core to prevent telemetry initialization
jest.mock('genkit', () => {
  const mockGenkit = jest.fn((config) => ({
    model: jest.fn(),
    flow: jest.fn(),
    prompt: jest.fn(),
  }));
  return {
    genkit: mockGenkit,
  };
});

// Mock Vertex AI to prevent initialization
jest.mock('@genkit-ai/vertexai', () => ({
  vertexAI: jest.fn(() => ({
    embedder: jest.fn(),
    model: jest.fn(),
  })),
}));

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Add OpenAI shim for fetch API before any OpenAI imports
// This must be at the top to ensure fetch is available when OpenAI SDK initializes
if (typeof globalThis.fetch === 'undefined') {
  // Use undici for Node.js environments
  try {
    const { fetch, Request, Response, Headers } = require('undici');
    globalThis.fetch = fetch;
    globalThis.Request = Request;
    globalThis.Response = Response;
    globalThis.Headers = Headers;
  } catch (e) {
    // If undici is not available, try node-fetch
    try {
      const fetch = require('node-fetch');
      globalThis.fetch = fetch;
    } catch (e2) {
      // Fallback: use native fetch if available (Node.js 18+)
      if (typeof fetch !== 'undefined') {
        globalThis.fetch = fetch;
      }
    }
  }
}

// NOTE: This setup file runs for BOTH jsdom and node test environments.
// Guard all browser-only globals so node-env tests can run (CI-safe).
if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

if (typeof window !== 'undefined') {
  // Mock Notification API
  Object.defineProperty(window, 'Notification', {
    writable: true,
    value: jest.fn().mockImplementation((title, options) => ({
      title,
      ...options,
      close: jest.fn(),
    })),
  })
}

if (typeof window !== 'undefined' && window.Notification) {
  // Mock Notification.permission
  Object.defineProperty(window.Notification, 'permission', {
    writable: true,
    value: 'default',
  })
}

if (typeof window !== 'undefined' && window.Notification) {
  // Mock Notification.requestPermission
  Object.defineProperty(window.Notification, 'requestPermission', {
    writable: true,
    value: jest.fn().mockResolvedValue('granted'),
  })
}

if (typeof window !== 'undefined') {
  // Mock localStorage
  const localStorageMock = (() => {
    let store = {}
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => { store[key] = value.toString() }),
      removeItem: jest.fn((key) => { delete store[key] }),
      clear: jest.fn(() => { store = {} }),
    }
  })()

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })
}

if (typeof window !== 'undefined') {
  // Mock sessionStorage
  const sessionStorageMock = (() => {
    let store = {}
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => { store[key] = value.toString() }),
      removeItem: jest.fn((key) => { delete store[key] }),
      clear: jest.fn(() => { store = {} }),
    }
  })()

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  })
}

// Polyfill Web APIs for Next.js API route tests
// Node.js 18+ provides fetch, Request, Response, Headers globally, but Jest may not have them
// These polyfills ensure tests that need these globals (e.g., for OpenAI SDK and Next.js) work correctly
if (typeof globalThis !== 'undefined') {
  // Request/Response/Headers must be set up BEFORE any Next.js imports
  if (typeof globalThis.Request === 'undefined') {
    try {
      // Try to use undici (Node.js 18+ uses this under the hood)
      const { Request, Response, Headers } = require('undici');
      globalThis.Request = Request;
      globalThis.Response = Response;
      globalThis.Headers = Headers;
      // Also set on global for compatibility
      global.Request = Request;
      global.Response = Response;
      global.Headers = Headers;
    } catch (e) {
      // If undici is not available, try to use native fetch (Node.js 18+)
      if (typeof fetch !== 'undefined') {
        // Use native fetch's Request/Response if available
        try {
          globalThis.Request = Request;
          globalThis.Response = Response;
          globalThis.Headers = Headers;
        } catch (e2) {
          // Fallback: create minimal stubs
          globalThis.Request = class Request {
            constructor(input, init) {
              this.url = typeof input === 'string' ? input : input.url;
              this.method = (init?.method || 'GET').toUpperCase();
              this.headers = new Headers(init?.headers);
            }
          };
          globalThis.Response = class Response {
            constructor(body, init) {
              this.body = body;
              this.status = init?.status || 200;
              this.headers = new Headers(init?.headers);
            }
            json() { return Promise.resolve(this.body); }
          };
          globalThis.Headers = class Headers {
            constructor(init) {
              this._headers = new Map(Array.isArray(init) ? init : Object.entries(init || {}));
            }
            get(name) { return this._headers.get(name.toLowerCase()); }
            set(name, value) { this._headers.set(name.toLowerCase(), value); }
          };
        }
      }
    }
  }

  // fetch is available in Node.js 18+, but ensure it's on globalThis for tests
  if (typeof globalThis.fetch === 'undefined') {
    if (typeof fetch !== 'undefined') {
      globalThis.fetch = fetch;
      global.fetch = fetch;
    } else {
      try {
        const { fetch } = require('undici');
        globalThis.fetch = fetch;
        global.fetch = fetch;
      } catch (e) {
        // Fallback: create minimal stub
        globalThis.fetch = async () => ({
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => '',
        });
      }
    }
  }

  // TextEncoder/TextDecoder are available in Node.js but ensure they're on globalThis
  if (typeof globalThis.TextEncoder === 'undefined' && typeof TextEncoder !== 'undefined') {
    globalThis.TextEncoder = TextEncoder;
    global.TextEncoder = TextEncoder;
  }
  if (typeof globalThis.TextDecoder === 'undefined' && typeof TextDecoder !== 'undefined') {
    globalThis.TextDecoder = TextDecoder;
    global.TextDecoder = TextDecoder;
  }
}

// Ensure WebCrypto exists for HMAC/signing code paths
try {
  const { webcrypto } = require('crypto');
  if (!global.crypto) {
    global.crypto = webcrypto;
  }
  if (!globalThis.crypto) {
    globalThis.crypto = webcrypto;
  }
} catch (_) {}

// Global safety net: Clean up any leaked timers/mocks after each test
afterEach(() => {
  // If any test switched to fake timers and forgot to revert, revert here.
  try { jest.useRealTimers(); } catch {}
  try { jest.clearAllTimers(); } catch {}
  try { jest.restoreAllMocks(); } catch {}
});

