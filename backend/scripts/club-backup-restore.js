#!/usr/bin/env node

/**
 * Club Data Backup and Restore System
 * 
 * Comprehensive backup and restore functionality for club data,
 * including full system backups, incremental backups, and selective restores.
 */

const path = require('path');
const fs = require('fs').promises;
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const zlib = require('zlib');
const crypto = require('crypto');

// Initialize Strapi programmatically
async function initializeStrapi() {
  const Strapi = require('@strapi/strapi');
  const strapi = Strapi({
    dir: path.resolve(__dirname, '..'),
    autoReload: false,
    serveAdminPanel: false,
  });

  await strapi.load();
  return strapi;
}

class ClubBackupRestoreManager {
  constructor(strapi) {
    this.strapi = strapi;
    this.backupDir = path.join(__dirname, '..', 'backups', 'club-data');
    this.results = {
      timestamp: new Date().toISOString(),
      operations: [],
      errors: [],
      warnings: []
    };
  }

  /**
   * Initialize backup directory
   */
  async initializeBackupDir() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Backup directory initialized: ${this.backupDir}`);
    } catch (error) {
      console.error('Failed to initialize backup directory:', error.message);
      throw error;
    }
  }

  /**
   * Log operation result
   */
  logOperation(operation, status, details = {}) {
    const entry = {
      operation,
      status,
      timestamp: new Date().toISOString(),
      details
    };

    this.results.operations.push(entry);
    
    if (status === 'error') {
      this.results.errors.push(entry);
      console.error(`❌ ${operation}: ${details.message || 'Unknown error'}`);
    } else if (status === 'warning') {
      this.results.warnings.push(entry);
      console.warn(`⚠️  ${operation}: ${details.message || 'Warning'}`);
    } else {
      console.log(`✅ ${operation}: ${details.message || 'Success'}`);
    }
  }

  /**
   * Generate backup metadata
   */
  generateBackupMetadata(backupType, tables, options = {}) {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      backupType,
      tables,
      options,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        strapiVersion: this.strapi.config.info.strapi || 'unknown'
      },
      checksum: null // Will be calculated after backup
    };
  }

  /**
   * Calculate file checksum
   */
  async calculateChecksum(filePath) {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);
    
    for await (const chunk of stream) {
      hash.update(chunk);
    }
    
    return hash.digest('hex');
  }

  /**
   * Export table data to JSON
   */
  async exportTableData(tableName, entityName, options = {}) {
    try {
      const { populate = [], filters = {}, limit = null } = options;
      
      console.log(`📤 Exporting ${tableName} data...`);
      
      const query = {
        populate,
        filters
      };
      
      if (limit) {
        query.limit = limit;
      }

      const data = await this.strapi.entityService.findMany(entityName, query);
      
      this.logOperation(`export_${tableName}`, 'success', {
        message: `Exported ${data.length} records from ${tableName}`,
        recordCount: data.length,
        tableName,
        entityName
      });

      return {
        tableName,
        entityName,
        recordCount: data.length,
        data,
        exportedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logOperation(`export_${tableName}`, 'error', {
        message: error.message,
        tableName,
        entityName,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Create full backup of all club-related data
   */
  async createFullBackup(options = {}) {
    try {
      console.log('🚀 Starting full club data backup...');
      
      await this.initializeBackupDir();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `club-full-backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, `${backupName}.json.gz`);

      // Define tables to backup
      const tablesToBackup = [
        {
          tableName: 'clubs',
          entityName: 'api::club.club',
          options: {
            populate: ['logo', 'ligen']
          }
        },
        {
          tableName: 'spiele',
          entityName: 'api::spiel.spiel',
          options: {
            populate: ['heim_club', 'gast_club', 'heim_team', 'gast_team', 'liga', 'saison']
          }
        },
        {
          tableName: 'tabellen_eintraege',
          entityName: 'api::tabellen-eintrag.tabellen-eintrag',
          options: {
            populate: ['club', 'team', 'liga']
          }
        },
        {
          tableName: 'ligen',
          entityName: 'api::liga.liga',
          options: {
            populate: ['clubs']
          }
        }
      ];

      // Export all table data
      const backupData = {
        metadata: this.generateBackupMetadata('full', tablesToBackup.map(t => t.tableName), options),
        tables: {}
      };

      for (const tableConfig of tablesToBackup) {
        const tableData = await this.exportTableData(
          tableConfig.tableName,
          tableConfig.entityName,
          tableConfig.options
        );
        backupData.tables[tableConfig.tableName] = tableData;
      }

      // Write compressed backup file
      const jsonData = JSON.stringify(backupData, null, 2);
      const gzipStream = zlib.createGzip({ level: 9 });
      
      await pipeline(
        async function* () {
          yield jsonData;
        },
        gzipStream,
        createWriteStream(backupPath)
      );

      // Calculate checksum
      const checksum = await this.calculateChecksum(backupPath);
      backupData.metadata.checksum = checksum;

      // Save metadata file
      const metadataPath = path.join(this.backupDir, `${backupName}.metadata.json`);
      await fs.writeFile(metadataPath, JSON.stringify(backupData.metadata, null, 2));

      const stats = await fs.stat(backupPath);
      
      this.logOperation('create_full_backup', 'success', {
        message: `Full backup created successfully`,
        backupPath,
        metadataPath,
        fileSize: stats.size,
        checksum,
        totalTables: Object.keys(backupData.tables).length,
        totalRecords: Object.values(backupData.tables).reduce((sum, table) => sum + table.recordCount, 0)
      });

      return {
        backupPath,
        metadataPath,
        metadata: backupData.metadata,
        fileSize: stats.size,
        checksum
      };

    } catch (error) {
      this.logOperation('create_full_backup', 'error', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Create incremental backup (only changed data since last backup)
   */
  async createIncrementalBackup(options = {}) {
    try {
      console.log('📈 Starting incremental club data backup...');
      
      await this.initializeBackupDir();
      
      const { since = null } = options;
      let sinceDate = since ? new Date(since) : null;

      // If no since date provided, find the last backup
      if (!sinceDate) {
        const backupFiles = await fs.readdir(this.backupDir);
        const metadataFiles = backupFiles.filter(f => f.endsWith('.metadata.json'));
        
        if (metadataFiles.length > 0) {
          // Get the most recent backup
          const latestMetadataFile = metadataFiles
            .map(f => ({
              file: f,
              path: path.join(this.backupDir, f),
              timestamp: f.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1]
            }))
            .filter(f => f.timestamp)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

          if (latestMetadataFile) {
            const metadata = JSON.parse(await fs.readFile(latestMetadataFile.path, 'utf8'));
            sinceDate = new Date(metadata.timestamp);
            console.log(`📅 Using last backup date: ${sinceDate.toISOString()}`);
          }
        }
      }

      if (!sinceDate) {
        console.log('⚠️  No previous backup found, creating full backup instead');
        return await this.createFullBackup(options);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `club-incremental-backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, `${backupName}.json.gz`);

      // Define tables to backup with incremental filters
      const tablesToBackup = [
        {
          tableName: 'clubs',
          entityName: 'api::club.club',
          options: {
            populate: ['logo', 'ligen'],
            filters: {
              updatedAt: { $gte: sinceDate }
            }
          }
        },
        {
          tableName: 'spiele',
          entityName: 'api::spiel.spiel',
          options: {
            populate: ['heim_club', 'gast_club', 'heim_team', 'gast_team', 'liga', 'saison'],
            filters: {
              updatedAt: { $gte: sinceDate }
            }
          }
        },
        {
          tableName: 'tabellen_eintraege',
          entityName: 'api::tabellen-eintrag.tabellen-eintrag',
          options: {
            populate: ['club', 'team', 'liga'],
            filters: {
              updatedAt: { $gte: sinceDate }
            }
          }
        }
      ];

      // Export incremental data
      const backupData = {
        metadata: this.generateBackupMetadata('incremental', tablesToBackup.map(t => t.tableName), {
          ...options,
          sinceDate: sinceDate.toISOString()
        }),
        tables: {}
      };

      let totalRecords = 0;
      for (const tableConfig of tablesToBackup) {
        const tableData = await this.exportTableData(
          tableConfig.tableName,
          tableConfig.entityName,
          tableConfig.options
        );
        backupData.tables[tableConfig.tableName] = tableData;
        totalRecords += tableData.recordCount;
      }

      if (totalRecords === 0) {
        this.logOperation('create_incremental_backup', 'warning', {
          message: 'No changes found since last backup',
          sinceDate: sinceDate.toISOString()
        });
        return null;
      }

      // Write compressed backup file
      const jsonData = JSON.stringify(backupData, null, 2);
      const gzipStream = zlib.createGzip({ level: 9 });
      
      await pipeline(
        async function* () {
          yield jsonData;
        },
        gzipStream,
        createWriteStream(backupPath)
      );

      // Calculate checksum and save metadata
      const checksum = await this.calculateChecksum(backupPath);
      backupData.metadata.checksum = checksum;

      const metadataPath = path.join(this.backupDir, `${backupName}.metadata.json`);
      await fs.writeFile(metadataPath, JSON.stringify(backupData.metadata, null, 2));

      const stats = await fs.stat(backupPath);
      
      this.logOperation('create_incremental_backup', 'success', {
        message: `Incremental backup created successfully`,
        backupPath,
        metadataPath,
        fileSize: stats.size,
        checksum,
        totalTables: Object.keys(backupData.tables).length,
        totalRecords,
        sinceDate: sinceDate.toISOString()
      });

      return {
        backupPath,
        metadataPath,
        metadata: backupData.metadata,
        fileSize: stats.size,
        checksum,
        totalRecords
      };

    } catch (error) {
      this.logOperation('create_incremental_backup', 'error', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      await this.initializeBackupDir();
      
      const backupFiles = await fs.readdir(this.backupDir);
      const metadataFiles = backupFiles.filter(f => f.endsWith('.metadata.json'));
      
      const backups = [];
      
      for (const metadataFile of metadataFiles) {
        try {
          const metadataPath = path.join(this.backupDir, metadataFile);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          
          const backupFile = metadataFile.replace('.metadata.json', '.json.gz');
          const backupPath = path.join(this.backupDir, backupFile);
          
          let fileSize = 0;
          try {
            const stats = await fs.stat(backupPath);
            fileSize = stats.size;
          } catch (error) {
            // Backup file might not exist
          }
          
          backups.push({
            name: backupFile.replace('.json.gz', ''),
            type: metadata.backupType,
            timestamp: metadata.timestamp,
            tables: metadata.tables,
            fileSize,
            checksum: metadata.checksum,
            metadataPath,
            backupPath: fileSize > 0 ? backupPath : null
          });
        } catch (error) {
          console.warn(`Failed to read metadata for ${metadataFile}:`, error.message);
        }
      }
      
      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log(`📋 Found ${backups.length} backups:`);
      backups.forEach(backup => {
        const size = backup.fileSize ? `${(backup.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A';
        console.log(`   ${backup.name} (${backup.type}) - ${backup.timestamp} - ${size}`);
      });
      
      return backups;

    } catch (error) {
      this.logOperation('list_backups', 'error', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Restore data from backup
   */
  async restoreFromBackup(backupName, options = {}) {
    try {
      console.log(`🔄 Starting restore from backup: ${backupName}`);
      
      const { dryRun = false, tables = null, skipValidation = false } = options;
      
      // Find backup files
      const metadataPath = path.join(this.backupDir, `${backupName}.metadata.json`);
      const backupPath = path.join(this.backupDir, `${backupName}.json.gz`);
      
      // Verify files exist
      try {
        await fs.access(metadataPath);
        await fs.access(backupPath);
      } catch (error) {
        throw new Error(`Backup files not found: ${backupName}`);
      }
      
      // Read and validate metadata
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      
      if (!skipValidation) {
        const currentChecksum = await this.calculateChecksum(backupPath);
        if (currentChecksum !== metadata.checksum) {
          throw new Error(`Backup file checksum mismatch. File may be corrupted.`);
        }
      }
      
      // Read backup data
      console.log('📖 Reading backup data...');
      const gzipStream = zlib.createGunzip();
      const chunks = [];
      
      await pipeline(
        createReadStream(backupPath),
        gzipStream,
        async function* (source) {
          for await (const chunk of source) {
            chunks.push(chunk);
          }
        }
      );
      
      const backupData = JSON.parse(Buffer.concat(chunks).toString());
      
      if (dryRun) {
        console.log('🔍 Dry run mode - showing what would be restored:');
        Object.entries(backupData.tables).forEach(([tableName, tableData]) => {
          if (!tables || tables.includes(tableName)) {
            console.log(`   ${tableName}: ${tableData.recordCount} records`);
          }
        });
        return { dryRun: true, tables: backupData.tables };
      }
      
      // Perform actual restore
      const restoredTables = {};
      
      for (const [tableName, tableData] of Object.entries(backupData.tables)) {
        if (tables && !tables.includes(tableName)) {
          continue; // Skip tables not in the filter
        }
        
        try {
          console.log(`🔄 Restoring ${tableName} (${tableData.recordCount} records)...`);
          
          let restoredCount = 0;
          let skippedCount = 0;
          let errorCount = 0;
          
          for (const record of tableData.data) {
            try {
              // Remove Strapi metadata fields
              const cleanRecord = { ...record };
              delete cleanRecord.id;
              delete cleanRecord.documentId;
              delete cleanRecord.createdAt;
              delete cleanRecord.updatedAt;
              delete cleanRecord.publishedAt;
              
              // Try to find existing record by unique fields
              let existingRecord = null;
              if (tableName === 'clubs' && cleanRecord.name) {
                existingRecord = await this.strapi.entityService.findMany(tableData.entityName, {
                  filters: { name: cleanRecord.name },
                  limit: 1
                });
                existingRecord = existingRecord[0] || null;
              }
              
              if (existingRecord) {
                // Update existing record
                await this.strapi.entityService.update(tableData.entityName, existingRecord.id, {
                  data: cleanRecord
                });
                skippedCount++;
              } else {
                // Create new record
                await this.strapi.entityService.create(tableData.entityName, {
                  data: cleanRecord
                });
                restoredCount++;
              }
              
            } catch (recordError) {
              errorCount++;
              console.warn(`   Failed to restore record: ${recordError.message}`);
            }
          }
          
          restoredTables[tableName] = {
            total: tableData.recordCount,
            restored: restoredCount,
            skipped: skippedCount,
            errors: errorCount
          };
          
          this.logOperation(`restore_${tableName}`, 'success', {
            message: `Restored ${tableName}: ${restoredCount} new, ${skippedCount} updated, ${errorCount} errors`,
            tableName,
            restored: restoredCount,
            skipped: skippedCount,
            errors: errorCount
          });
          
        } catch (error) {
          this.logOperation(`restore_${tableName}`, 'error', {
            message: error.message,
            tableName,
            stack: error.stack
          });
        }
      }
      
      this.logOperation('restore_from_backup', 'success', {
        message: `Restore completed from backup: ${backupName}`,
        backupName,
        restoredTables,
        totalTables: Object.keys(restoredTables).length
      });
      
      return {
        backupName,
        metadata,
        restoredTables,
        success: true
      };

    } catch (error) {
      this.logOperation('restore_from_backup', 'error', {
        message: error.message,
        backupName,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(options = {}) {
    try {
      console.log('🧹 Cleaning up old backups...');
      
      const { retentionDays = 30, keepMinimum = 5 } = options;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const backups = await this.listBackups();
      
      // Filter backups older than retention period
      const oldBackups = backups.filter(backup => 
        new Date(backup.timestamp) < cutoffDate
      );
      
      // Keep minimum number of backups
      const backupsToDelete = oldBackups.slice(keepMinimum);
      
      let deletedCount = 0;
      for (const backup of backupsToDelete) {
        try {
          if (backup.backupPath) {
            await fs.unlink(backup.backupPath);
          }
          await fs.unlink(backup.metadataPath);
          deletedCount++;
          
          this.logOperation('delete_old_backup', 'success', {
            message: `Deleted old backup: ${backup.name}`,
            backupName: backup.name,
            timestamp: backup.timestamp
          });
        } catch (error) {
          this.logOperation('delete_old_backup', 'error', {
            message: `Failed to delete backup ${backup.name}: ${error.message}`,
            backupName: backup.name,
            error: error.message
          });
        }
      }
      
      this.logOperation('cleanup_old_backups', 'success', {
        message: `Cleaned up ${deletedCount} old backups`,
        totalBackups: backups.length,
        deletedCount,
        retentionDays,
        keepMinimum
      });
      
      return { deletedCount, totalBackups: backups.length };

    } catch (error) {
      this.logOperation('cleanup_old_backups', 'error', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Generate backup report
   */
  generateReport() {
    const summary = {
      totalOperations: this.results.operations.length,
      successfulOperations: this.results.operations.filter(op => op.status === 'success').length,
      warnings: this.results.warnings.length,
      errors: this.results.errors.length,
      timestamp: new Date().toISOString()
    };

    console.log('\n📊 Backup/Restore Report Summary:');
    console.log(`   Total Operations: ${summary.totalOperations}`);
    console.log(`   Successful: ${summary.successfulOperations}`);
    console.log(`   Warnings: ${summary.warnings}`);
    console.log(`   Errors: ${summary.errors}`);

    return { ...this.results, summary };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const operation = args[0];
  const backupName = args[1];

  let strapi;
  try {
    strapi = await initializeStrapi();
    const backupManager = new ClubBackupRestoreManager(strapi);

    switch (operation) {
      case 'full':
        await backupManager.createFullBackup();
        break;
      case 'incremental':
        await backupManager.createIncrementalBackup();
        break;
      case 'list':
        await backupManager.listBackups();
        break;
      case 'restore':
        if (!backupName) {
          console.error('Please provide backup name for restore operation');
          process.exit(1);
        }
        await backupManager.restoreFromBackup(backupName);
        break;
      case 'cleanup':
        await backupManager.cleanupOldBackups();
        break;
      default:
        console.log('Usage: node club-backup-restore.js <operation> [backup-name]');
        console.log('Operations:');
        console.log('  full        - Create full backup');
        console.log('  incremental - Create incremental backup');
        console.log('  list        - List available backups');
        console.log('  restore     - Restore from backup (requires backup name)');
        console.log('  cleanup     - Clean up old backups');
        process.exit(1);
    }

    backupManager.generateReport();

  } catch (error) {
    console.error('Backup/restore operation failed:', error);
    process.exit(1);
  } finally {
    if (strapi) {
      await strapi.destroy();
    }
  }
}

// Export for programmatic use
module.exports = { ClubBackupRestoreManager, initializeStrapi };

// Run if called directly
if (require.main === module) {
  main();
}