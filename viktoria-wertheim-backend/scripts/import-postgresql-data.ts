#!/usr/bin/env ts-node

import { PostgreSQLImporter, ImportProgress, PostgreSQLConnectionConfig } from './postgresql-import';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';

interface CLIOptions {
  inputPath?: string;
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  batchSize?: number;
  createSchema?: boolean;
  dropExisting?: boolean;
  validateData?: boolean;
  verbose?: boolean;
  testConnection?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--input':
      case '-i':
        options.inputPath = args[++i];
        break;
      case '--connection-string':
        options.connectionString = args[++i];
        break;
      case '--host':
        options.host = args[++i];
        break;
      case '--port':
        options.port = parseInt(args[++i]);
        break;
      case '--database':
      case '-d':
        options.database = args[++i];
        break;
      case '--user':
      case '-u':
        options.user = args[++i];
        break;
      case '--password':
      case '-p':
        options.password = args[++i];
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--create-schema':
        options.createSchema = true;
        break;
      case '--drop-existing':
        options.dropExisting = true;
        break;
      case '--no-validate':
        options.validateData = false;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--test-connection':
        options.testConnection = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
${chalk.bold('PostgreSQL Data Import Tool')}

Import transformed data into PostgreSQL database for Strapi migration.

${chalk.bold('Usage:')}
  npm run import:postgresql [options]

${chalk.bold('Options:')}
  -i, --input <path>           Path to transformed data file (JSON)
  --connection-string <url>    PostgreSQL connection string
  --host <host>                Database host (default: localhost)
  --port <port>                Database port (default: 5432)
  -d, --database <name>        Database name
  -u, --user <username>        Database username
  -p, --password <password>    Database password
  --batch-size <number>        Records per batch (default: 1000)
  --create-schema              Create database schema before import
  --drop-existing              Drop existing tables before creating schema
  --no-validate                Skip data validation
  --test-connection            Test connection and exit
  -v, --verbose                Verbose output
  -h, --help                   Show this help message

${chalk.bold('Environment Variables:')}
  DATABASE_URL                 PostgreSQL connection string
  DATABASE_HOST                Database host
  DATABASE_PORT                Database port
  DATABASE_NAME                Database name
  DATABASE_USERNAME            Database username
  DATABASE_PASSWORD            Database password
  DATABASE_SSL                 Enable SSL (true/false)
  DATABASE_SCHEMA              Database schema (default: public)

${chalk.bold('Examples:')}
  npm run import:postgresql --input ./exports/transformed-data.json
  npm run import:postgresql --host localhost --database viktoria_wertheim --create-schema
  npm run import:postgresql --connection-string "postgresql://user:pass@localhost/db"
  npm run import:postgresql --test-connection
`);
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

async function loadTransformedData(inputPath: string): Promise<Record<string, any[]>> {
  try {
    const data = await fs.readFile(inputPath, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Handle different data formats
    if (parsed.transformedData) {
      return parsed.transformedData;
    } else if (parsed.data) {
      return parsed.data;
    } else {
      return parsed;
    }
  } catch (error) {
    throw new Error(`Failed to load transformed data from ${inputPath}: ${error.message}`);
  }
}

async function testConnection(options: CLIOptions): Promise<void> {
  console.log(chalk.blue('🔍 Testing PostgreSQL connection...'));
  
  const connectionConfig: PostgreSQLConnectionConfig = {
    connectionString: options.connectionString,
    host: options.host,
    port: options.port,
    database: options.database,
    user: options.user,
    password: options.password
  };

  const importer = new PostgreSQLImporter({
    connectionConfig,
    createSchema: false
  });

  try {
    await importer.testConnection();
    console.log(chalk.green('✅ Connection successful!'));
    
    if (options.verbose) {
      console.log(chalk.blue('\n📋 Connection Details:'));
      console.log(`Host: ${connectionConfig.host || process.env.DATABASE_HOST || 'localhost'}`);
      console.log(`Port: ${connectionConfig.port || process.env.DATABASE_PORT || '5432'}`);
      console.log(`Database: ${connectionConfig.database || process.env.DATABASE_NAME || 'viktoria_wertheim'}`);
      console.log(`User: ${connectionConfig.user || process.env.DATABASE_USERNAME || 'postgres'}`);
      console.log(`SSL: ${connectionConfig.ssl || process.env.DATABASE_SSL === 'true' ? 'enabled' : 'disabled'}`);
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Connection failed: ${error.message}`));
    process.exit(1);
  } finally {
    await importer.close();
  }
}

async function runImport(options: CLIOptions): Promise<void> {
  // Determine input path - find latest transformed data file
  let inputPath = options.inputPath;
  
  if (!inputPath) {
    const exportsDir = path.join(__dirname, '../exports');
    try {
      const files = await fs.readdir(exportsDir);
      const transformedFiles = files
        .filter(file => file.startsWith('postgresql-data-') && file.endsWith('.json'))
        .sort()
        .reverse();
      
      if (transformedFiles.length === 0) {
        throw new Error('No transformed data files found. Please run data transformation first.');
      }
      
      inputPath = path.join(exportsDir, transformedFiles[0]);
      console.log(chalk.blue(`📂 Using latest transformed data: ${transformedFiles[0]}`));
    } catch (error) {
      throw new Error(`Failed to find transformed data files: ${error.message}`);
    }
  }

  console.log(chalk.blue(`📂 Loading transformed data from: ${inputPath}`));
  
  let transformedData: Record<string, any[]>;
  try {
    transformedData = await loadTransformedData(inputPath);
  } catch (error) {
    console.error(chalk.red(`❌ ${error.message}`));
    process.exit(1);
  }

  const tableCount = Object.keys(transformedData).length;
  const totalRecords = Object.values(transformedData).reduce((sum, records) => sum + records.length, 0);

  console.log(chalk.green(`✅ Loaded ${totalRecords.toLocaleString()} records from ${tableCount} tables`));

  // Build connection config
  const connectionConfig: PostgreSQLConnectionConfig = {
    connectionString: options.connectionString,
    host: options.host,
    port: options.port,
    database: options.database,
    user: options.user,
    password: options.password
  };

  const importer = new PostgreSQLImporter({
    connectionConfig,
    batchSize: options.batchSize,
    createSchema: options.createSchema,
    dropExisting: options.dropExisting,
    validateData: options.validateData !== false,
    onProgress: (progress: ImportProgress) => {
      const tableProgress = Math.round((progress.completedTables / progress.totalTables) * 100);
      const recordProgress = Math.round((progress.processedRecords / progress.totalRecords) * 100);
      const eta = progress.estimatedTimeRemaining ? formatDuration(progress.estimatedTimeRemaining) : 'calculating...';
      
      process.stdout.write(`\r${chalk.blue('📥')} Importing: ${progress.currentTable} | Tables: ${tableProgress}% | Records: ${recordProgress}% | ETA: ${eta}`);
    }
  });

  // Set up event listeners for verbose output
  if (options.verbose) {
    importer.on('connected', (data) => {
      console.log(chalk.green(`🔗 Connected to PostgreSQL: ${data.config.host}:${data.config.port}/${data.config.database}`));
    });

    importer.on('importStarted', (data) => {
      console.log(chalk.blue(`🚀 Starting import of ${data.totalTables} tables...`));
    });

    importer.on('schemaCreated', () => {
      console.log(chalk.green('🏗️  Database schema created successfully'));
    });

    importer.on('tableStarted', (data) => {
      console.log(chalk.yellow(`📋 Processing table: ${data.tableName} (${data.index}/${data.total}) - ${data.recordCount} records`));
    });

    importer.on('tableCompleted', (data) => {
      console.log(chalk.green(`✅ Completed: ${data.tableName} (${data.recordCount} records)`));
    });

    importer.on('tableError', (data) => {
      console.log(chalk.red(`❌ Error in table ${data.tableName}: ${data.error}`));
    });

    importer.on('tableBatchProcessed', (data) => {
      if (data.totalRecords > 1000) { // Only show batch progress for large tables
        const percentage = Math.round((data.totalProcessed / data.totalRecords) * 100);
        console.log(chalk.gray(`   📦 Batch processed: ${data.totalProcessed}/${data.totalRecords} (${percentage}%)`));
      }
    });

    importer.on('foreignKeysCreated', () => {
      console.log(chalk.green('🔗 Foreign key constraints created'));
    });

    importer.on('foreignKeyWarning', (data) => {
      console.log(chalk.yellow(`⚠️  Foreign key warning for ${data.table}: ${data.error}`));
    });
  }

  try {
    console.log(chalk.blue('🔍 Starting PostgreSQL data import...'));
    
    const result = await importer.import(transformedData);
    
    console.log('\n'); // New line after progress indicator
    
    if (result.success) {
      console.log(chalk.green('✅ Import completed successfully!'));
      console.log(chalk.blue('\n📊 Import Summary:'));
      console.log(`📅 Import date: ${result.metadata.importDate.toISOString()}`);
      console.log(`⏱️  Duration: ${formatDuration(result.metadata.duration)}`);
      console.log(`📋 Tables imported: ${result.metadata.totalTables}`);
      console.log(`📄 Total records: ${result.metadata.totalRecords.toLocaleString()}`);
      console.log(`🏗️  Schema created: ${result.metadata.schemaCreated ? 'Yes' : 'No'}`);
      console.log(`🔗 Database: ${result.metadata.connectionConfig.host}:${result.metadata.connectionConfig.port}/${result.metadata.connectionConfig.database}`);
      
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        result.warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
      }
      
      console.log(chalk.blue('\n📋 Tables imported:'));
      result.metadata.tablesProcessed.forEach(tableName => {
        const recordCount = transformedData[tableName]?.length || 0;
        console.log(`  ${tableName.padEnd(25)} ${recordCount.toString().padStart(8)} records`);
      });
      
    } else {
      console.log(chalk.red('❌ Import completed with errors:'));
      result.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
      
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        result.warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Import failed: ${error.message}`));
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const options = parseArgs();
  
  console.log(chalk.bold.blue('🏗️  Viktoria Wertheim - PostgreSQL Import Tool\n'));

  if (options.testConnection) {
    await testConnection(options);
    return;
  }

  await runImport(options);
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n⚠️  Import interrupted by user'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n⚠️  Import terminated'));
  process.exit(0);
});

// Run the main function
main().catch(error => {
  console.error(chalk.red(`💥 Unexpected error: ${error.message}`));
  process.exit(1);
});