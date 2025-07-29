/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Mock Strapi global
global.strapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  db: {
    query: jest.fn(),
    transaction: jest.fn()
  },
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
} as any;

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test cleanup
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});

// Handle process cleanup
process.on('exit', () => {
  // Cleanup any remaining handles
});

// Suppress unhandled promise rejection warnings in tests
process.on('unhandledRejection', (reason, promise) => {
  // Log but don't crash in test environment
  console.warn('Unhandled Rejection at:', promise, 'reason:', reason);
});