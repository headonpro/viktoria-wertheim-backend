/**
 * Jest Configuration for End-to-End Tests
 * Specialized configuration for comprehensive E2E testing
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'E2E Tests',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.ts',
    '<rootDir>/tests/e2e/**/*.test.js'
  ],
  
  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globalSetup: '<rootDir>/tests/e2e/global-setup.ts',
  globalTeardown: '<rootDir>/tests/e2e/global-teardown.ts',
  
  // Timeouts for E2E tests (longer than unit tests)
  testTimeout: 120000, // 2 minutes per test
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      diagnostics: false
    }]
  },
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.test.ts'
  ],
  coverageDirectory: '<rootDir>/coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Performance and resource management
  maxWorkers: 1, // Run E2E tests sequentially to avoid conflicts
  forceExit: true,
  detectOpenHandles: true,
  
  // Improved test isolation
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Verbose output for E2E tests
  verbose: true,
  
  // Custom reporters for E2E results
  reporters: [
    'default'
  ],
  
  // Environment variables for E2E tests
  setupFiles: ['<rootDir>/tests/e2e/env-setup.js'],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  
  // Custom test environment for E2E
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};