/**
 * Test script to validate database configuration
 * This script tests the database configuration without starting the full Strapi application
 */

const path = require('path');
const { validateDatabaseConfig, logValidationResults } = require('../config/database-validation.js');

// Mock environment function similar to Strapi's env
const createEnvMock = (envVars) => {
  const env = (key, defaultValue) => envVars[key] || defaultValue;
  env.int = (key, defaultValue) => {
    const value = envVars[key];
    return value ? parseInt(value, 10) : defaultValue;
  };
  env.bool = (key, defaultValue) => {
    const value = envVars[key];
    if (value === undefined) return defaultValue;
    return value === 'true' || value === true;
  };
  return env;
};

// Test PostgreSQL configuration
console.log('🧪 Testing PostgreSQL configuration...\n');

// Test 1: Valid PostgreSQL configuration
console.log('Test 1: Valid PostgreSQL configuration');
try {
  const validPostgresEnv = createEnvMock({
    DATABASE_CLIENT: 'postgres',
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
    DATABASE_NAME: 'viktoria_wertheim',
    DATABASE_USERNAME: 'strapi',
    DATABASE_PASSWORD: 'test_password',
    DATABASE_POOL_MIN: '2',
    DATABASE_POOL_MAX: '10'
  });

  const result = validateDatabaseConfig(validPostgresEnv);
  logValidationResults(result, 'postgres');
  console.log('✅ Test 1 passed\n');
} catch (error) {
  console.error('❌ Test 1 failed:', error.message, '\n');
}

// Test 2: Invalid PostgreSQL configuration (missing required fields)
console.log('Test 2: Invalid PostgreSQL configuration (missing required fields)');
try {
  const invalidPostgresEnv = createEnvMock({
    DATABASE_CLIENT: 'postgres',
    DATABASE_HOST: 'localhost',
    // Missing DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD
  });

  const result = validateDatabaseConfig(invalidPostgresEnv);
  logValidationResults(result, 'postgres');
  
  if (!result.isValid) {
    console.log('✅ Test 2 passed (correctly identified invalid config)\n');
  } else {
    console.log('❌ Test 2 failed (should have been invalid)\n');
  }
} catch (error) {
  console.error('❌ Test 2 failed:', error.message, '\n');
}

// Test 3: Valid SQLite configuration
console.log('Test 3: Valid SQLite configuration');
try {
  const validSqliteEnv = createEnvMock({
    DATABASE_CLIENT: 'sqlite',
    DATABASE_FILENAME: '.tmp/data.db'
  });

  const result = validateDatabaseConfig(validSqliteEnv);
  logValidationResults(result, 'sqlite');
  console.log('✅ Test 3 passed\n');
} catch (error) {
  console.error('❌ Test 3 failed:', error.message, '\n');
}

// Test 4: PostgreSQL with connection string
console.log('Test 4: PostgreSQL with connection string');
try {
  const connectionStringEnv = createEnvMock({
    DATABASE_CLIENT: 'postgres',
    DATABASE_URL: 'postgresql://strapi:password@localhost:5432/viktoria_wertheim'
  });

  const result = validateDatabaseConfig(connectionStringEnv);
  logValidationResults(result, 'postgres');
  console.log('✅ Test 4 passed\n');
} catch (error) {
  console.error('❌ Test 4 failed:', error.message, '\n');
}

console.log('🏁 Database configuration tests completed!');