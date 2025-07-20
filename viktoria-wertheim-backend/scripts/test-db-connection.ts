#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests the database connection management utilities
 */

import { 
  DatabaseConnectionUtils,
  PostgreSQLConnectionConfig,
  ConnectionPoolManager,
  DatabaseHealthChecker
} from '../config/database-connection';

// Load environment variables
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection Management Utilities\n');

  // Test environment configuration validation
  console.log('1. Testing Environment Configuration Validation...');
  const mockEnv = (key: string, defaultValue?: any) => {
    const envValues = {
      'DATABASE_CLIENT': process.env.DATABASE_CLIENT || 'postgres',
      'DATABASE_HOST': process.env.DATABASE_HOST || 'localhost',
      'DATABASE_PORT': process.env.DATABASE_PORT || '5432',
      'DATABASE_NAME': process.env.DATABASE_NAME || 'viktoria_wertheim',
      'DATABASE_USERNAME': process.env.DATABASE_USERNAME || 'strapi',
      'DATABASE_PASSWORD': process.env.DATABASE_PASSWORD || 'strapi',
      'DATABASE_URL': process.env.DATABASE_URL,
      'DATABASE_SSL': process.env.DATABASE_SSL || 'false',
      'DATABASE_SCHEMA': process.env.DATABASE_SCHEMA || 'public'
    };
    return envValues[key] || defaultValue;
  };

  mockEnv.int = (key: string, defaultValue?: number) => {
    const value = mockEnv(key);
    return value ? parseInt(value, 10) : defaultValue;
  };

  mockEnv.bool = (key: string, defaultValue?: boolean) => {
    const value = mockEnv(key);
    return value ? value.toLowerCase() === 'true' : defaultValue;
  };

  const envValidation = await DatabaseConnectionUtils.validateEnvironmentConfig(mockEnv);
  console.log(`   Environment validation: ${envValidation.isValid ? '✅ Valid' : '❌ Invalid'}`);
  
  if (envValidation.errors.length > 0) {
    console.log('   Errors:');
    envValidation.errors.forEach((error: string) => console.log(`     - ${error}`));
  }
  
  if (envValidation.warnings.length > 0) {
    console.log('   Warnings:');
    envValidation.warnings.forEach((warning: string) => console.log(`     - ${warning}`));
  }

  // Test PostgreSQL configuration validation
  console.log('\n2. Testing PostgreSQL Configuration Validation...');
  const config: PostgreSQLConnectionConfig = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'viktoria_wertheim',
    user: process.env.DATABASE_USERNAME || 'strapi',
    password: process.env.DATABASE_PASSWORD || 'strapi',
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true',
    schema: process.env.DATABASE_SCHEMA || 'public'
  };

  const validator = DatabaseConnectionUtils.createValidator(config);
  const configValidation = await validator.validateConfiguration();
  console.log(`   Configuration validation: ${configValidation.isValid ? '✅ Valid' : '❌ Invalid'}`);
  
  if (configValidation.errors.length > 0) {
    console.log('   Errors:');
    configValidation.errors.forEach(error => console.log(`     - ${error}`));
  }
  
  if (configValidation.warnings.length > 0) {
    console.log('   Warnings:');
    configValidation.warnings.forEach(warning => console.log(`     - ${warning}`));
  }

  // Test connection if configuration is valid
  if (configValidation.isValid) {
    console.log('\n3. Testing Database Connection...');
    try {
      const connectionTest = await validator.testConnection();
      console.log(`   Connection test: ${connectionTest.isValid ? '✅ Success' : '❌ Failed'}`);
      
      if (connectionTest.connectionTime) {
        console.log(`   Connection time: ${connectionTest.connectionTime}ms`);
      }
      
      if (connectionTest.errors.length > 0) {
        console.log('   Connection errors:');
        connectionTest.errors.forEach(error => console.log(`     - ${error}`));
      }
      
      if (connectionTest.warnings.length > 0) {
        console.log('   Connection warnings:');
        connectionTest.warnings.forEach(warning => console.log(`     - ${warning}`));
      }

      // Test health check if connection is successful
      if (connectionTest.isValid) {
        console.log('\n4. Testing Database Health Check...');
        const healthChecker = DatabaseConnectionUtils.createHealthChecker(config);
        const healthResult = await healthChecker.checkHealth();
        
        console.log(`   Health check: ${healthResult.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
        console.log(`   Response time: ${healthResult.responseTime}ms`);
        
        if (healthResult.connectionCount !== undefined) {
          console.log(`   Active connections: ${healthResult.connectionCount}`);
        }
        
        if (healthResult.error) {
          console.log(`   Health check error: ${healthResult.error}`);
        }

        // Test extended health check
        console.log('\n5. Testing Extended Health Check...');
        try {
          const extendedHealth = await healthChecker.checkExtendedHealth();
          console.log(`   Extended health check: ${extendedHealth.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
          
          if (extendedHealth.diagnostics) {
            console.log('   Database diagnostics:');
            console.log(`     - Version: ${extendedHealth.diagnostics.version}`);
            console.log(`     - Database: ${extendedHealth.diagnostics.serverInfo?.current_database}`);
            console.log(`     - User: ${extendedHealth.diagnostics.serverInfo?.current_user}`);
            console.log(`     - Connection stats: ${JSON.stringify(extendedHealth.diagnostics.connectionStats)}`);
          }
        } catch (error) {
          console.log(`   Extended health check failed: ${error.message}`);
        }

        // Test connection pool management
        console.log('\n6. Testing Connection Pool Management...');
        const poolManager = DatabaseConnectionUtils.createPoolManager(config, {
          min: 2,
          max: 10
        });

        const poolValidation = poolManager.validatePoolConfig();
        console.log(`   Pool configuration: ${poolValidation.isValid ? '✅ Valid' : '❌ Invalid'}`);
        
        if (poolValidation.errors.length > 0) {
          console.log('   Pool errors:');
          poolValidation.errors.forEach(error => console.log(`     - ${error}`));
        }
        
        if (poolValidation.warnings.length > 0) {
          console.log('   Pool warnings:');
          poolValidation.warnings.forEach(warning => console.log(`     - ${warning}`));
        }

        try {
          await poolManager.initializePool();
          console.log('   Pool initialization: ✅ Success');
          
          const poolStats = poolManager.getPoolStats();
          console.log(`   Pool stats: Total=${poolStats.totalConnections}, Idle=${poolStats.idleConnections}, Waiting=${poolStats.waitingClients}`);
          
          // Test health check with pool
          const poolHealthChecker = DatabaseConnectionUtils.createHealthChecker(config, poolManager.getPool());
          const poolHealthResult = await poolHealthChecker.checkHealth();
          console.log(`   Pool health check: ${poolHealthResult.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
          
          if (poolHealthResult.poolStatus) {
            console.log(`   Pool status: Total=${poolHealthResult.poolStatus.totalConnections}, Idle=${poolHealthResult.poolStatus.idleConnections}, Waiting=${poolHealthResult.poolStatus.waitingClients}`);
          }
          
          await poolManager.closePool();
          console.log('   Pool cleanup: ✅ Success');
          
        } catch (error) {
          console.log(`   Pool test failed: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`   Connection test failed: ${error.message}`);
    }
  }

  console.log('\n🎉 Database connection utilities test completed!');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDatabaseConnection().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

export { testDatabaseConnection };