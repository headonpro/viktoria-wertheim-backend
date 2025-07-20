#!/usr/bin/env ts-node

import { SQLiteExporter, ExportProgress } from './sqlite-export';
import path from 'path';
import chalk from 'chalk';

interface CLIOptions {
  databasePath?: string;
  outputPath?: string;
  includeSystemTables?: boolean;
  batchSize?: number;
  verbose?: boolean;
  statsOnly?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--database':
      case '-d':
        options.databasePath = args[++i];
        break;
      case '--output':
      case '-o':
        options.outputPath = args[++i];
        break;
      case '--include-system':
        options.includeSystemTables = true;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--stats-only':
        options.statsOnly = true;
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
${chalk.bold('SQLite Data Export Tool')}

Export data from SQLite database for PostgreSQL migration.

${chalk.bold('Usage:')}
  npm run export:sqlite [options]

${chalk.bold('Options:')}
  -d, --database <path>     Path to SQLite database file
  -o, --output <path>       Output directory for export files
  --include-system          Include Strapi system tables
  --batch-size <number>     Number of records to process per batch (default: 1000)
  --stats-only              Only show database statistics, don't export
  -v, --verbose             Verbose output
  -h, --help                Show this help message

${chalk.bold('Examples:')}
  npm run export:sqlite
  npm run export:sqlite --database ./custom/path/data.db
  npm run export:sqlite --output ./exports --verbose
  npm run export:sqlite --stats-only
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

async function showStatistics(exporter: SQLiteExporter): Promise<void> {
  console.log(chalk.blue('📊 Analyzing database...'));
  
  try {
    const stats = await exporter.getStatistics();
    
    console.log(chalk.green('\n✅ Database Statistics:'));
    console.log(`📁 Database size: ${formatBytes(stats.databaseSize)}`);
    console.log(`📋 Total tables: ${stats.tables.length}`);
    console.log(`📄 Total records: ${stats.totalRecords.toLocaleString()}`);
    
    console.log(chalk.blue('\n📊 Table breakdown:'));
    stats.tables
      .sort((a, b) => b.recordCount - a.recordCount)
      .forEach(table => {
        const percentage = ((table.recordCount / stats.totalRecords) * 100).toFixed(1);
        console.log(`  ${table.name.padEnd(25)} ${table.recordCount.toString().padStart(8)} records (${percentage}%)`);
      });
      
  } catch (error) {
    console.error(chalk.red(`❌ Error getting statistics: ${error.message}`));
    process.exit(1);
  }
}

async function runExport(options: CLIOptions): Promise<void> {
  const exporter = new SQLiteExporter({
    databasePath: options.databasePath,
    outputPath: options.outputPath,
    includeSystemTables: options.includeSystemTables,
    batchSize: options.batchSize,
    onProgress: (progress: ExportProgress) => {
      const percentage = Math.round((progress.completedTables / progress.totalTables) * 100);
      const eta = progress.estimatedTimeRemaining ? formatDuration(progress.estimatedTimeRemaining) : 'calculating...';
      
      process.stdout.write(`\r${chalk.blue('📤')} Exporting: ${progress.currentTable} (${percentage}%) - ETA: ${eta}`);
    }
  });

  // Set up event listeners for verbose output
  if (options.verbose) {
    exporter.on('connected', (data) => {
      console.log(chalk.green(`🔗 Connected to database: ${data.path}`));
    });

    exporter.on('exportStarted', (data) => {
      console.log(chalk.blue(`🚀 Starting export of ${data.totalTables} tables...`));
    });

    exporter.on('tableStarted', (data) => {
      console.log(chalk.yellow(`📋 Processing table: ${data.tableName} (${data.index}/${data.total})`));
    });

    exporter.on('tableCompleted', (data) => {
      console.log(chalk.green(`✅ Completed: ${data.tableName} (${data.recordCount} records)`));
    });

    exporter.on('tableError', (data) => {
      console.log(chalk.red(`❌ Error in table ${data.tableName}: ${data.error}`));
    });

    exporter.on('tableBatchProcessed', (data) => {
      if (data.totalRecords > 1000) { // Only show batch progress for large tables
        const percentage = Math.round((data.totalProcessed / data.totalRecords) * 100);
        console.log(chalk.gray(`   📦 Batch processed: ${data.totalProcessed}/${data.totalRecords} (${percentage}%)`));
      }
    });
  }

  try {
    console.log(chalk.blue('🔍 Starting SQLite data export...'));
    
    const result = await exporter.export();
    
    console.log('\n'); // New line after progress indicator
    
    if (result.success) {
      console.log(chalk.green('✅ Export completed successfully!'));
      console.log(chalk.blue('\n📊 Export Summary:'));
      console.log(`📅 Export date: ${result.metadata.exportDate.toISOString()}`);
      console.log(`⏱️  Duration: ${formatDuration(result.metadata.duration)}`);
      console.log(`📋 Tables exported: ${result.metadata.totalTables}`);
      console.log(`📄 Total records: ${result.metadata.totalRecords.toLocaleString()}`);
      console.log(`📁 Database: ${result.metadata.databasePath}`);
      
      console.log(chalk.blue('\n📋 Content types exported:'));
      result.metadata.contentTypes.forEach(contentType => {
        const tableData = result.data[contentType];
        if (tableData && typeof tableData === 'object' && 'recordCount' in tableData) {
          console.log(`  ${contentType.padEnd(25)} ${(tableData as any).recordCount.toString().padStart(8)} records`);
        }
      });
      
    } else {
      console.log(chalk.red('❌ Export completed with errors:'));
      result.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Export failed: ${error.message}`));
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const options = parseArgs();
  
  console.log(chalk.bold.blue('🏗️  Viktoria Wertheim - SQLite Export Tool\n'));

  // Set default paths if not provided
  const defaultDatabasePath = path.join(__dirname, '../.tmp/data.db');
  const defaultOutputPath = path.join(__dirname, '../exports');

  const exporter = new SQLiteExporter({
    databasePath: options.databasePath || defaultDatabasePath,
    outputPath: options.outputPath || defaultOutputPath,
    includeSystemTables: options.includeSystemTables,
    batchSize: options.batchSize
  });

  if (options.statsOnly) {
    await showStatistics(exporter);
  } else {
    if (options.verbose) {
      await showStatistics(exporter);
      console.log('\n');
    }
    await runExport(options);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n⚠️  Export interrupted by user'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n⚠️  Export terminated'));
  process.exit(0);
});

// Run the main function
main().catch(error => {
  console.error(chalk.red(`💥 Unexpected error: ${error.message}`));
  process.exit(1);
});