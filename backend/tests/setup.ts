/**
 * Jest test setup file
 * Configures global test environment and mocks
 */

// Mock Strapi global object
global.strapi = {
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  db: {
    query: jest.fn()
  },
  config: {
    get: jest.fn()
  }
} as any;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Set test timeout
jest.setTimeout(30000);