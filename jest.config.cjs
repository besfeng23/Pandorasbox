// jest.config.cjs
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // IMPORTANT: match your tsconfig paths. If "@/*" -> "src/*", use this:
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // lucide-react ships ESM builds; map to a lightweight test stub to avoid ESM-in-jest issues.
    '^lucide-react$': '<rootDir>/src/__mocks__/lucide-react.tsx',
    // react-markdown (and some plugins) ship ESM; stub for Jest.
    '^react-markdown$': '<rootDir>/src/__mocks__/react-markdown.tsx',
    '^remark-gfm$': '<rootDir>/src/__mocks__/remark-gfm.ts',
  },

  // Force-transform TS/JS with Next's Babel preset
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  modulePathIgnorePatterns: [
    '<rootDir>/.firebase/',
    '<rootDir>/.next/',
    '<rootDir>/packages/',
    '<rootDir>/Pandorasbox/',
    '<rootDir>/node_modules/',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/.firebase/',
    '/packages/',
    '/Pandorasbox/',
    '/AppData/',
    '/Documents/',
    '/Desktop/',
    '/Programs/',
    '/Local/',
    '/tests/test-utils/',
  ],
  testMatch: [
    '<rootDir>/src/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/tests/**/*.test.[jt]s?(x)',
    '<rootDir>/tests/**/*.spec.[jt]s?(x)',
  ],
  roots: ['<rootDir>'],
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
};

module.exports = createJestConfig(customJestConfig);

