#!/usr/bin/env node

/**
 * Database Migration Runner
 * Handles running SQL migrations with proper error handling and rollback capabilities
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const chalk = require('chalk');

class MigrationRunner {
  constructor(config) {
    this.config = config;
    this.client = new Client(config.database.connection);
    this.migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    this.logFile = path.join(__dirname, '..', 'logs', 'migrations.log');
  }

  async connect() {
    try {
      await this.client.connect();
      this.log('Connected to database');
    } catch (error) {
      this.error('Failed to connect to database:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await this.client.end();
    this.log('Disconnected from database');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(chalk.blue(logMessage));
    
    // Write to log file
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  error(message, details = '') {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message} ${details}`;
    console.error(chalk.red(errorMessage));
    
    // Write to log file
    fs.appendFileSync(this.logFile, errorMessage + '\n');
  }

  success(message) {
    console.log(chalk.green(`✓ ${message}`));
  }

  warning(message) {
    console.log(chalk.yellow(`⚠ ${message}`));
  }

  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS knex_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        batch INTEGER NOT NULL,
        migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_knex_migrations_name ON knex_migrations(name);
    `;

    try {
      await this.client.query(query);
      this.log('Migrations table created/verified');
    } catch (error) {
      this.error('Failed to create migrations table:', error.message);
      throw error;
    }
  }

  async getAppliedMigrations() {
    try {
      const result = await this.client.query('SELECT name FROM knex_migrations ORDER BY id');
      return result.rows.map(row => row.name);
    } catch (error) {
      this.error('Failed to get applied migrations:', error.message);
      return [];
    }
  }

  async getAvailableMigrations() {
    try {
      const files = fs.readdirSync(this.migrationsDir);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (error) {
      this.error('Failed to read migrations directory:', error.message);
      return [];
    }
  }

  async getPendingMigrations() {
    const applied = await this.getAppliedMigrations();
    const available = await this.getAvailableMigrations();
    
    return available.filter(migration => !applied.includes(migration));
  }

  async runMigration(migrationFile) {
    const migrationPath = path.join(this.migrationsDir, migrationFile);
    
    try {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      this.log(`Running migration: ${migrationFile}`);
      
      // Begin transaction
      await this.client.query('BEGIN');
      
      try {
        // Execute migration SQL
        await this.client.query(sql);
        
        // Record migration
        await this.client.query(
          'INSERT INTO knex_migrations (name, batch) VALUES ($1, $2)',
          [migrationFile, 1]
        );
        
        // Commit transaction
        await this.client.query('COMMIT');
        
        this.success(`Migration ${migrationFile} completed successfully`);
        return true;
      } catch (error) {
        // Rollback transaction
        await this.client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      this.error(`Migration ${migrationFile} failed:`, error.message);
      return false;
    }
  }

  async runAllPendingMigrations() {
    const pending = await this.getPendingMigrations();
    
    if (pending.length === 0) {
      this.log('No pending migrations');
      return true;
    }

    this.log(`Found ${pending.length} pending migrations`);
    
    let allSuccessful = true;
    
    for (const migration of pending) {
      const success = await this.runMigration(migration);
      if (!success) {
        allSuccessful = false;
        break;
      }
    }
    
    return allSuccessful;
  }

  async rollbackLastMigration() {
    try {
      const result = await this.client.query(
        'SELECT name FROM knex_migrations ORDER BY id DESC LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        this.warning('No migrations to rollback');
        return true;
      }
      
      const lastMigration = result.rows[0].name;
      this.log(`Rolling back migration: ${lastMigration}`);
      
      // Check if rollback file exists
      const rollbackFile = lastMigration.replace('.sql', '.rollback.sql');
      const rollbackPath = path.join(this.migrationsDir, rollbackFile);
      
      if (!fs.existsSync(rollbackPath)) {
        this.error(`Rollback file not found: ${rollbackFile}`);
        return false;
      }
      
      const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');
      
      // Begin transaction
      await this.client.query('BEGIN');
      
      try {
        // Execute rollback SQL
        await this.client.query(rollbackSql);
        
        // Remove migration record
        await this.client.query(
          'DELETE FROM knex_migrations WHERE name = $1',
          [lastMigration]
        );
        
        // Commit transaction
        await this.client.query('COMMIT');
        
        this.success(`Rollback of ${lastMigration} completed successfully`);
        return true;
      } catch (error) {
        // Rollback transaction
        await this.client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      this.error('Rollback failed:', error.message);
      return false;
    }
  }

  async validateMigrations() {
    this.log('Validating migrations...');
    
    const applied = await this.getAppliedMigrations();
    const available = await this.getAvailableMigrations();
    
    // Check for missing migration files
    const missingFiles = applied.filter(migration => !available.includes(migration));
    if (missingFiles.length > 0) {
      this.error('Missing migration files:', missingFiles.join(', '));
      return false;
    }
    
    // Check for SQL syntax errors
    for (const migration of available) {
      const migrationPath = path.join(this.migrationsDir, migration);
      try {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        // Basic SQL validation
        if (!sql.trim()) {
          this.error(`Empty migration file: ${migration}`);
          return false;
        }
        
        // Check for dangerous operations in production
        if (process.env.NODE_ENV === 'production') {
          const dangerousOperations = ['DROP TABLE', 'DROP DATABASE', 'TRUNCATE'];
          const upperSql = sql.toUpperCase();
          
          for (const operation of dangerousOperations) {
            if (upperSql.includes(operation)) {
              this.warning(`Dangerous operation found in ${migration}: ${operation}`);
            }
          }
        }
      } catch (error) {
        this.error(`Failed to read migration ${migration}:`, error.message);
        return false;
      }
    }
    
    this.success('Migration validation completed');
    return true;
  }

  async getStatus() {
    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();
    
    console.log(chalk.cyan('\n=== Migration Status ==='));
    console.log(`Applied migrations: ${applied.length}`);
    console.log(`Pending migrations: ${pending.length}`);
    
    if (applied.length > 0) {
      console.log(chalk.green('\nApplied:'));
      applied.forEach(migration => console.log(`  ✓ ${migration}`));
    }
    
    if (pending.length > 0) {
      console.log(chalk.yellow('\nPending:'));
      pending.forEach(migration => console.log(`  ○ ${migration}`));
    }
    
    console.log('');
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2] || 'migrate';
  const environment = process.env.NODE_ENV || 'development';
  
  // Load configuration
  let config;
  try {
    const configPath = path.join(__dirname, '..', 'config', 'environments', `${environment}.json`);
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error(chalk.red('Failed to load configuration:'), error.message);
    process.exit(1);
  }
  
  // Create logs directory
  const logsDir = path.dirname(path.join(__dirname, '..', 'logs', 'migrations.log'));
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const runner = new MigrationRunner(config);
  
  try {
    await runner.connect();
    await runner.createMigrationsTable();
    
    switch (command) {
      case 'migrate':
        const success = await runner.runAllPendingMigrations();
        process.exit(success ? 0 : 1);
        break;
        
      case 'rollback':
        const rollbackSuccess = await runner.rollbackLastMigration();
        process.exit(rollbackSuccess ? 0 : 1);
        break;
        
      case 'status':
        await runner.getStatus();
        break;
        
      case 'validate':
        const valid = await runner.validateMigrations();
        process.exit(valid ? 0 : 1);
        break;
        
      default:
        console.log('Usage: node migration-runner.js [migrate|rollback|status|validate]');
        process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Migration runner failed:'), error.message);
    process.exit(1);
  } finally {
    await runner.disconnect();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Unhandled error:'), error);
    process.exit(1);
  });
}

module.exports = MigrationRunner;