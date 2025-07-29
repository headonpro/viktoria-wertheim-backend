/**
 * Jest Configuration for Frontend E2E Tests
 * Specialized configuration for frontend integration testing
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'Frontend E2E Tests',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.ts',
    '<rootDir>/tests/e2e/**/*.test.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Timeouts for E2E tests (longer for browser automation)
  testTimeout: 180000, // 3 minutes per test
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: false
    }]
  },
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.stories.ts'
  ],
  coverageDirectory: '<rootDir>/coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Performance and resource management
  maxWorkers: 1, // Run E2E tests sequentially
  forceExit: true,
  detectOpenHandles: true,
  
  // Test isolation
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Custom reporters
  reporters: [
    'default'
  ],
  
  // Environment setup
  setupFiles: ['<rootDir>/tests/e2e/env-setup.js'],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  
  // Global configuration
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};