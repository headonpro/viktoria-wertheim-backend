#!/usr/bin/env node

/**
 * Database Migration Runner for Club System Deployment
 * 
 * Handles schema migrations, data migrations, and rollback procedures
 * with zero-downtime deployment support.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const chalk = require('chalk');

class DatabaseMigrationRunner {
  constructor(options = {}) {
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    
    this.dbConfig = {
      host: process.env.DATABASE_HOST || 'localhost',
      port: process.env.DATABASE_PORT || 5432,
      database: process.env.DATABASE_NAME || 'viktoria_wertheim',
      user: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || '',
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    };
    
    this.migrationsDir = path.join(__dirname, '..', '..', 'database', 'migrations', 'club-system');
    this.backupDir = path.join(__dirname, '..', '..', 'backups', 'migrations');
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.migrationsDir, this.backupDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  log(message, level = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      debug: chalk.gray
    };
    
    if (level === 'debug' && !this.verbose) return;
    
    console.log(colors[level](`[${level.toUpperCase()}] ${message}`));
  }

  async createConnection() {
    const client = new Client(this.dbConfig);
    await client.connect();
    return client;
  }

  async executeQuery(client, query, description) {
    this.log(`Executing: ${description}`, 'debug');
    
    if (this.dryRun) {
      this.log(`DRY RUN: Would execute: ${query.substring(0, 100)}...`, 'warning');
      return { rows: [], rowCount: 0 };
    }
    
    try {
      const result = await client.query(query);
      this.log(`✅ ${description} - ${result.rowCount} rows affected`, 'success');
      return result;
    } catch (error) {
      this.log(`❌ Failed: ${description} - ${error.message}`, 'error');
      throw error;
    }
  }

  async createMigrationTable(client) {
    const query = `
      CREATE TABLE IF NOT EXISTS club_system_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        rollback_sql TEXT,
        checksum VARCHAR(64),
        environment VARCHAR(50) DEFAULT '${this.environment}'
      );
      
      CREATE INDEX IF NOT EXISTS idx_club_migrations_name ON club_system_migrations(migration_name);
      CREATE INDEX IF NOT EXISTS idx_club_migrations_executed ON club_system_migrations(executed_at);
    `;
    
    await this.executeQuery(client, query, 'Creating migration tracking table');
  }

  async getExecutedMigrations(client) {
    const result = await client.query(
      'SELECT migration_name FROM club_system_migrations ORDER BY executed_at'
    );
    return result.rows.map(row => row.migration_name);
  }

  async recordMigration(client, migrationName, rollbackSql, checksum) {
    if (this.dryRun) return;
    
    await client.query(
      `INSERT INTO club_system_migrations (migration_name, rollback_sql, checksum, environment) 
       VALUES ($1, $2, $3, $4)`,
      [migrationName, rollbackSql, checksum, this.environment]
    );
  }

  async removeMigrationRecord(client, migrationName) {
    if (this.dryRun) return;
    
    await client.query(
      'DELETE FROM club_system_migrations WHERE migration_name = $1',
      [migrationName]
    );
  }

  generateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  getMigrationFiles() {
    if (!fs.existsSync(this.migrationsDir)) {
      this.log('No migrations directory found', 'warning');
      return [];
    }
    
    return fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .map(file => ({
        name: file.replace('.sql', ''),
        path: path.join(this.migrationsDir, file)
      }));
  }

  async createBackup(client) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `pre-migration-${timestamp}.sql`);
    
    this.log(`Creating backup: ${backupFile}`);
    
    if (this.dryRun) {
      this.log('DRY RUN: Would create database backup', 'warning');
      return backupFile;
    }
    
    try {
      // Export schema and data for club-related tables
      const tables = [
        'clubs', 'clubs_ligen_links', 'spiele', 'tabellen_eintraege',
        'ligen', 'teams', 'saisons'
      ];
      
      let backupContent = `-- Database backup created: ${new Date().toISOString()}\n`;
      backupContent += `-- Environment: ${this.environment}\n\n`;
      
      for (const table of tables) {
        try {
          // Check if table exists
          const tableExists = await client.query(
            `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
            [table]
          );
          
          if (!tableExists.rows[0].exists) {
            this.log(`Table ${table} does not exist, skipping`, 'debug');
            continue;
          }
          
          // Get table schema
          const schemaResult = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position
          `, [table]);
          
          backupContent += `-- Table: ${table}\n`;
          backupContent += `-- Columns: ${schemaResult.rows.map(r => r.column_name).join(', ')}\n\n`;
          
          // Get table data
          const dataResult = await client.query(`SELECT * FROM ${table}`);
          
          if (dataResult.rows.length > 0) {
            const columns = Object.keys(dataResult.rows[0]);
            backupContent += `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n`;
            
            const values = dataResult.rows.map(row => {
              const vals = columns.map(col => {
                const val = row[col];
                if (val === null) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                if (val instanceof Date) return `'${val.toISOString()}'`;
                return val;
              });
              return `(${vals.join(', ')})`;
            });
            
            backupContent += values.join(',\n') + ';\n\n';
          }
        } catch (error) {
          this.log(`Warning: Could not backup table ${table}: ${error.message}`, 'warning');
        }
      }
      
      fs.writeFileSync(backupFile, backupContent);
      this.log(`✅ Backup created: ${backupFile}`, 'success');
      
      return backupFile;
    } catch (error) {
      this.log(`❌ Backup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async runMigrations() {
    this.log('=== STARTING DATABASE MIGRATIONS ===');
    
    const client = await this.createConnection();
    
    try {
      // Create migration tracking table
      await this.createMigrationTable(client);
      
      // Create backup
      await this.createBackup(client);
      
      // Get migration files and executed migrations
      const migrationFiles = this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations(client);
      
      this.log(`Found ${migrationFiles.length} migration files`);
      this.log(`${executedMigrations.length} migrations already executed`);
      
      // Filter pending migrations
      const pendingMigrations = migrationFiles.filter(
        migration => !executedMigrations.includes(migration.name)
      );
      
      if (pendingMigrations.length === 0) {
        this.log('✅ No pending migrations', 'success');
        return;
      }
      
      this.log(`Executing ${pendingMigrations.length} pending migrations`);
      
      // Execute migrations in transaction
      await client.query('BEGIN');
      
      try {
        for (const migration of pendingMigrations) {
          await this.executeMigration(client, migration);
        }
        
        if (!this.dryRun) {
          await client.query('COMMIT');
          this.log('✅ All migrations committed successfully', 'success');
        } else {
          await client.query('ROLLBACK');
          this.log('DRY RUN: All migrations would be committed', 'warning');
        }
      } catch (error) {
        await client.query('ROLLBACK');
        this.log('❌ Migration failed, transaction rolled back', 'error');
        throw error;
      }
      
    } finally {
      await client.end();
    }
  }

  async executeMigration(client, migration) {
    this.log(`Executing migration: ${migration.name}`);
    
    const migrationContent = fs.readFileSync(migration.path, 'utf8');
    const checksum = this.generateChecksum(migrationContent);
    
    // Parse migration file for up and down sections
    const sections = this.parseMigrationFile(migrationContent);
    
    if (!sections.up) {
      throw new Error(`Migration ${migration.name} missing UP section`);
    }
    
    // Execute UP migration
    await this.executeQuery(client, sections.up, `Migration ${migration.name} UP`);
    
    // Record migration
    await this.recordMigration(client, migration.name, sections.down, checksum);
    
    this.log(`✅ Migration ${migration.name} completed`, 'success');
  }

  parseMigrationFile(content) {
    const sections = { up: '', down: '' };
    const lines = content.split('\n');
    let currentSection = null;
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed.startsWith('-- +migrate up')) {
        currentSection = 'up';
        continue;
      } else if (trimmed.startsWith('-- +migrate down')) {
        currentSection = 'down';
        continue;
      }
      
      if (currentSection && !line.trim().startsWith('--')) {
        sections[currentSection] += line + '\n';
      }
    }
    
    return sections;
  }

  async rollbackMigration(migrationName) {
    this.log(`=== ROLLING BACK MIGRATION: ${migrationName} ===`);
    
    const client = await this.createConnection();
    
    try {
      // Get migration record
      const result = await client.query(
        'SELECT rollback_sql FROM club_system_migrations WHERE migration_name = $1',
        [migrationName]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`Migration ${migrationName} not found in migration history`);
      }
      
      const rollbackSql = result.rows[0].rollback_sql;
      
      if (!rollbackSql) {
        throw new Error(`No rollback SQL available for migration ${migrationName}`);
      }
      
      // Create backup before rollback
      await this.createBackup(client);
      
      // Execute rollback in transaction
      await client.query('BEGIN');
      
      try {
        await this.executeQuery(client, rollbackSql, `Rollback ${migrationName}`);
        await this.removeMigrationRecord(client, migrationName);
        
        if (!this.dryRun) {
          await client.query('COMMIT');
          this.log(`✅ Migration ${migrationName} rolled back successfully`, 'success');
        } else {
          await client.query('ROLLBACK');
          this.log('DRY RUN: Migration would be rolled back', 'warning');
        }
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      
    } finally {
      await client.end();
    }
  }

  async getMigrationStatus() {
    const client = await this.createConnection();
    
    try {
      const migrationFiles = this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations(client);
      
      const status = migrationFiles.map(migration => ({
        name: migration.name,
        executed: executedMigrations.includes(migration.name),
        path: migration.path
      }));
      
      return {
        total: migrationFiles.length,
        executed: executedMigrations.length,
        pending: migrationFiles.length - executedMigrations.length,
        migrations: status
      };
    } finally {
      await client.end();
    }
  }

  async validateMigrations() {
    this.log('=== VALIDATING MIGRATIONS ===');
    
    const client = await this.createConnection();
    const issues = [];
    
    try {
      // Check migration table exists
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'club_system_migrations'
        )
      `);
      
      if (!tableExists.rows[0].exists) {
        issues.push('Migration tracking table does not exist');
        return { valid: false, issues };
      }
      
      // Check for orphaned migration records
      const executedMigrations = await this.getExecutedMigrations(client);
      const migrationFiles = this.getMigrationFiles().map(m => m.name);
      
      const orphanedRecords = executedMigrations.filter(
        name => !migrationFiles.includes(name)
      );
      
      if (orphanedRecords.length > 0) {
        issues.push(`Orphaned migration records: ${orphanedRecords.join(', ')}`);
      }
      
      // Check for missing migration files
      const missingFiles = executedMigrations.filter(
        name => !migrationFiles.includes(name)
      );
      
      if (missingFiles.length > 0) {
        issues.push(`Missing migration files: ${missingFiles.join(', ')}`);
      }
      
      // Validate migration file checksums
      for (const migration of this.getMigrationFiles()) {
        if (executedMigrations.includes(migration.name)) {
          const content = fs.readFileSync(migration.path, 'utf8');
          const currentChecksum = this.generateChecksum(content);
          
          const result = await client.query(
            'SELECT checksum FROM club_system_migrations WHERE migration_name = $1',
            [migration.name]
          );
          
          if (result.rows.length > 0 && result.rows[0].checksum !== currentChecksum) {
            issues.push(`Migration ${migration.name} has been modified after execution`);
          }
        }
      }
      
      return {
        valid: issues.length === 0,
        issues
      };
    } finally {
      await client.end();
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const options = {
    environment: process.env.NODE_ENV || 'development',
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose')
  };
  
  const runner = new DatabaseMigrationRunner(options);
  
  async function runCommand() {
    try {
      switch (command) {
        case 'migrate':
          await runner.runMigrations();
          break;
          
        case 'rollback':
          const migrationName = args[1];
          if (!migrationName) {
            console.error('Please specify migration name to rollback');
            process.exit(1);
          }
          await runner.rollbackMigration(migrationName);
          break;
          
        case 'status':
          const status = await runner.getMigrationStatus();
          console.log(JSON.stringify(status, null, 2));
          break;
          
        case 'validate':
          const validation = await runner.validateMigrations();
          if (validation.valid) {
            console.log('✅ All migrations are valid');
          } else {
            console.error('❌ Migration validation failed:');
            validation.issues.forEach(issue => console.error(`  - ${issue}`));
            process.exit(1);
          }
          break;
          
        default:
          console.log('Usage:');
          console.log('  node database-migration-runner.js migrate [--dry-run] [--verbose]');
          console.log('  node database-migration-runner.js rollback <migration-name> [--dry-run]');
          console.log('  node database-migration-runner.js status');
          console.log('  node database-migration-runner.js validate');
          process.exit(1);
      }
    } catch (error) {
      console.error('❌ Command failed:', error.message);
      process.exit(1);
    }
  }
  
  runCommand();
}

module.exports = DatabaseMigrationRunner;