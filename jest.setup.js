// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

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
// These polyfills ensure tests that need these globals (e.g., for OpenAI SDK) work correctly
if (typeof globalThis !== 'undefined') {
  // fetch is available in Node.js 18+, but ensure it's on globalThis for tests
  if (typeof globalThis.fetch === 'undefined' && typeof fetch !== 'undefined') {
    globalThis.fetch = fetch;
  }

  // Request/Response/Headers are available in Node.js 18+, but ensure they're on globalThis
  if (typeof globalThis.Request === 'undefined') {
    try {
      // Try to use undici (Node.js 18+ uses this under the hood)
      const { Request, Response, Headers } = require('undici');
      globalThis.Request = Request;
      globalThis.Response = Response;
      globalThis.Headers = Headers;
    } catch (e) {
      // If undici is not available, tests should use NextRequest/NextResponse from Next.js
      // This is fine - most tests already do
    }
  }

  // TextEncoder/TextDecoder are available in Node.js but ensure they're on globalThis
  if (typeof globalThis.TextEncoder === 'undefined' && typeof TextEncoder !== 'undefined') {
    globalThis.TextEncoder = TextEncoder;
  }
  if (typeof globalThis.TextDecoder === 'undefined' && typeof TextDecoder !== 'undefined') {
    globalThis.TextDecoder = TextDecoder;
  }
}

