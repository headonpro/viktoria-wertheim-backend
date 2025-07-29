/**
 * Environment Setup for E2E Tests
 * Sets up environment variables and test configuration
 */

// Test environment configuration
process.env.NODE_ENV = 'test';
process.env.STRAPI_DISABLE_UPDATE_NOTIFICATION = 'true';
process.env.STRAPI_HIDE_STARTUP_MESSAGE = 'true';

// Database configuration for E2E tests
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/viktoria_test_e2e';
}

// Automation configuration
process.env.AUTOMATION_ENABLED = 'true';
process.env.QUEUE_CONCURRENCY = '1';
process.env.QUEUE_MAX_RETRIES = '3';
process.env.QUEUE_JOB_TIMEOUT = '30000';

// Performance configuration
process.env.CACHE_ENABLED = 'false';
process.env.PERFORMANCE_MONITORING = 'true';
process.env.LOG_LEVEL = 'error';

// Frontend configuration
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:1337';

// Test-specific configuration
process.env.AUTO_CLEANUP = 'true';
process.env.TEST_TIMEOUT = '120000';

console.log('🔧 E2E test environment variables configured');