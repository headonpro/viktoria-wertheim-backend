/**
 * Environment Setup for Frontend E2E Tests
 */

// Test environment configuration
process.env.NODE_ENV = 'test';

// Frontend and backend URLs
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:1337';

// Puppeteer configuration
process.env.PUPPETEER_HEADLESS = process.env.CI === 'true' ? 'true' : 'false';
process.env.PUPPETEER_SLOWMO = process.env.CI === 'true' ? '0' : '50';

// Test configuration
process.env.TEST_TIMEOUT = '180000';
process.env.AUTO_CLEANUP = 'true';

console.log('🔧 Frontend E2E test environment configured');