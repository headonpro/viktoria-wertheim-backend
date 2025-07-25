/**
 * Jest setup file for backend tests
 */

// Mock Strapi global object for tests
global.strapi = {
  entityService: {
    findMany: jest.fn(),
  },
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
} as any;