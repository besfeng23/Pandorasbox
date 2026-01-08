// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

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

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  writable: true,
  value: jest.fn().mockImplementation((title, options) => ({
    title,
    ...options,
    close: jest.fn(),
  })),
})

// Mock Notification.permission
Object.defineProperty(window.Notification, 'permission', {
  writable: true,
  value: 'default',
})

// Mock Notification.requestPermission
Object.defineProperty(window.Notification, 'requestPermission', {
  writable: true,
  value: jest.fn().mockResolvedValue('granted'),
})

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

