/**
 * Database Configuration Validation Utilities
 * Ensures proper PostgreSQL configuration for production deployment
 * 
 * @deprecated This file is being migrated to TypeScript. Use database-connection.ts instead.
 */

const { DatabaseConnectionUtils } = require('./database-connection');

/**
 * Validates PostgreSQL configuration parameters
 * @deprecated Use DatabaseConnectionUtils.validateEnvironmentConfig instead
 */
const validatePostgreSQLConfig = (env) => {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };

  const config = {
    host: env('DATABASE_HOST'),
    port: env.int('DATABASE_PORT'),
    database: env('DATABASE_NAME'),
    username: env('DATABASE_USERNAME'),
    password: env('DATABASE_PASSWORD'),
    connectionString: env('DATABASE_URL'),
    ssl: env.bool('DATABASE_SSL', false),
    schema: env('DATABASE_SCHEMA', 'public')
  };

  // Check if using connection string or individual parameters
  const usingConnectionString = !!config.connectionString;
  const usingIndividualParams = !!(config.host && config.database && config.username && config.password);

  if (!usingConnectionString && !usingIndividualParams) {
    result.errors.push(
      'PostgreSQL configuration incomplete. Either provide DATABASE_URL or all of: DATABASE_HOST, DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD'
    );
  }

  // Validate individual parameters if not using connection string
  if (!usingConnectionString) {
    if (!config.host) {
      result.errors.push('DATABASE_HOST is required for PostgreSQL connection');
    }

    if (!config.database) {
      result.errors.push('DATABASE_NAME is required for PostgreSQL connection');
    }

    if (!config.username) {
      result.errors.push('DATABASE_USERNAME is required for PostgreSQL connection');
    }

    if (!config.password) {
      result.errors.push('DATABASE_PASSWORD is required for PostgreSQL connection');
    }

    // Validate port
    if (config.port && (config.port < 1 || config.port > 65535)) {
      result.errors.push('DATABASE_PORT must be between 1 and 65535');
    }
  }

  // Connection pool validation
  const poolMin = env.int('DATABASE_POOL_MIN', 2);
  const poolMax = env.int('DATABASE_POOL_MAX', 10);

  if (poolMin < 1) {
    result.errors.push('DATABASE_POOL_MIN must be at least 1');
  }

  if (poolMax < poolMin) {
    result.errors.push('DATABASE_POOL_MAX must be greater than or equal to DATABASE_POOL_MIN');
  }

  // Single-server deployment warnings
  if (poolMax > 15) {
    result.warnings.push(
      'DATABASE_POOL_MAX is set to more than 15 connections. For single-server deployment, consider reducing to 10-15 for optimal resource usage.'
    );
  }

  if (config.host && config.host !== 'localhost' && config.host !== '127.0.0.1') {
    result.warnings.push(
      'DATABASE_HOST is not set to localhost. For single-server deployment, using localhost is recommended for better performance.'
    );
  }

  // SSL warnings for local connections
  if (config.ssl && (config.host === 'localhost' || config.host === '127.0.0.1')) {
    result.warnings.push(
      'SSL is enabled for localhost connection. This may not be necessary for local PostgreSQL instances.'
    );
  }

  // Set overall validity
  result.isValid = result.errors.length === 0;

  return result;
};

/**
 * Validates SQLite configuration (for development fallback)
 */
const validateSQLiteConfig = (env) => {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };

  const filename = env('DATABASE_FILENAME', '.tmp/data.db');

  if (!filename) {
    result.errors.push('DATABASE_FILENAME is required for SQLite connection');
  }

  // Warning for production use
  if (env('NODE_ENV') === 'production') {
    result.warnings.push(
      'SQLite is not recommended for production use. Consider migrating to PostgreSQL for better performance and concurrent access.'
    );
  }

  result.isValid = result.errors.length === 0;
  return result;
};

/**
 * Main database configuration validation function
 */
const validateDatabaseConfig = (env) => {
  const client = env('DATABASE_CLIENT', 'sqlite');
  
  let result;

  switch (client) {
    case 'postgres':
      result = validatePostgreSQLConfig(env);
      break;
    case 'sqlite':
      result = validateSQLiteConfig(env);
      break;
    default:
      result = {
        isValid: false,
        errors: [`Unsupported database client: ${client}. Supported clients are: postgres, sqlite`],
        warnings: []
      };
  }

  return result;
};

/**
 * Logs validation results to console
 */
const logValidationResults = (result, client) => {
  if (result.errors.length > 0) {
    console.error(`❌ Database configuration errors for ${client}:`);
    result.errors.forEach(error => console.error(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.warn(`⚠️  Database configuration warnings for ${client}:`);
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (result.isValid && result.errors.length === 0 && result.warnings.length === 0) {
    console.log(`✅ Database configuration for ${client} is valid`);
  }
};

module.exports = {
  validatePostgreSQLConfig,
  validateSQLiteConfig,
  validateDatabaseConfig,
  logValidationResults
};