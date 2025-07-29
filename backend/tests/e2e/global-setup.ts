/**
 * Global Setup for E2E Tests
 * Initializes test environment and resources
 */

import { performance } from 'perf_hooks';

export default async function globalSetup() {
  const startTime = performance.now();
  
  console.log('🔧 Setting up E2E test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/viktoria_test_e2e';
  process.env.STRAPI_DISABLE_UPDATE_NOTIFICATION = 'true';
  process.env.STRAPI_HIDE_STARTUP_MESSAGE = 'true';
  
  // Configure test-specific settings
  process.env.AUTOMATION_ENABLED = 'true';
  process.env.QUEUE_CONCURRENCY = '1'; // Sequential processing for tests
  process.env.CACHE_ENABLED = 'false'; // Disable caching for predictable tests
  
  // Frontend test configuration
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:1337';
  
  // Performance monitoring
  process.env.PERFORMANCE_MONITORING = 'true';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  
  // Database cleanup configuration
  process.env.AUTO_CLEANUP = 'true';
  
  console.log('✅ E2E test environment configured');
  
  // Verify required services are available
  await verifyServices();
  
  const setupTime = performance.now() - startTime;
  console.log(`⏱️  Global setup completed in ${Math.round(setupTime)}ms`);
}

async function verifyServices() {
  console.log('🔍 Verifying required services...');
  
  // Check if database is accessible
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    
    console.log('✅ Database connection verified');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw new Error('Database not available for E2E tests');
  }
  
  // Check if frontend is running (for frontend E2E tests)
  if (process.env.FRONTEND_URL) {
    try {
      const axios = require('axios');
      await axios.get(process.env.FRONTEND_URL, { timeout: 5000 });
      console.log('✅ Frontend service verified');
    } catch (error) {
      console.warn('⚠️  Frontend service not available - frontend E2E tests will be skipped');
    }
  }
  
  console.log('✅ Service verification completed');
}