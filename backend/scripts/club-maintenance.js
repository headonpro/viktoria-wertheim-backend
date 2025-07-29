#!/usr/bin/env node

/**
 * Club Data Maintenance Script
 * 
 * Comprehensive maintenance tool for club data cleanup, validation,
 * and system health checks.
 */

const path = require('path');
const fs = require('fs').promises;

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

class ClubMaintenanceManager {
  constructor(strapi) {
    this.strapi = strapi;
    this.results = {
      timestamp: new Date().toISOString(),
      operations: [],
      errors: [],
      warnings: [],
      summary: {}
    };
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
   * Clean up orphaned club records
   */
  async cleanupOrphanedClubs() {
    try {
      console.log('\n🧹 Cleaning up orphaned club records...');

      // Find clubs without any liga relationships
      const clubsWithoutLiga = await this.strapi.db.query('api::club.club').findMany({
        populate: ['ligen'],
        where: {
          ligen: { $null: true }
        }
      });

      let cleanedCount = 0;
      for (const club of clubsWithoutLiga) {
        // Check if club is referenced in any games
        const gameCount = await this.strapi.db.query('api::spiel.spiel').count({
          where: {
            $or: [
              { heim_club: club.id },
              { gast_club: club.id }
            ]
          }
        });

        // Check if club is referenced in any table entries
        const tableEntryCount = await this.strapi.db.query('api::tabellen-eintrag.tabellen-eintrag').count({
          where: { club: club.id }
        });

        if (gameCount === 0 && tableEntryCount === 0) {
          await this.strapi.entityService.delete('api::club.club', club.id);
          cleanedCount++;
          this.logOperation('cleanup_orphaned_club', 'success', {
            message: `Removed orphaned club: ${club.name}`,
            clubId: club.id,
            clubName: club.name
          });
        } else {
          this.logOperation('cleanup_orphaned_club', 'warning', {
            message: `Club ${club.name} has no liga but is referenced in ${gameCount} games and ${tableEntryCount} table entries`,
            clubId: club.id,
            clubName: club.name,
            gameCount,
            tableEntryCount
          });
        }
      }

      this.logOperation('cleanup_orphaned_clubs_summary', 'success', {
        message: `Cleaned up ${cleanedCount} orphaned clubs`,
        totalChecked: clubsWithoutLiga.length,
        cleaned: cleanedCount
      });

    } catch (error) {
      this.logOperation('cleanup_orphaned_clubs', 'error', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Clean up duplicate club names
   */
  async cleanupDuplicateClubs() {
    try {
      console.log('\n🔍 Checking for duplicate club names...');

      // Find clubs with duplicate names
      const duplicateQuery = `
        SELECT name, COUNT(*) as count, array_agg(id) as ids
        FROM clubs 
        GROUP BY name 
        HAVING COUNT(*) > 1
      `;

      const duplicates = await this.strapi.db.connection.raw(duplicateQuery);
      const duplicateRows = duplicates.rows || [];

      let resolvedCount = 0;
      for (const duplicate of duplicateRows) {
        const clubIds = duplicate.ids;
        const clubName = duplicate.name;

        // Get full club details
        const clubs = await this.strapi.db.query('api::club.club').findMany({
          where: { id: { $in: clubIds } },
          populate: ['ligen']
        });

        // Keep the club with the most relationships
        let keepClub = clubs[0];
        let maxRelationships = 0;

        for (const club of clubs) {
          const gameCount = await this.strapi.db.query('api::spiel.spiel').count({
            where: {
              $or: [
                { heim_club: club.id },
                { gast_club: club.id }
              ]
            }
          });

          const tableEntryCount = await this.strapi.db.query('api::tabellen-eintrag.tabellen-eintrag').count({
            where: { club: club.id }
          });

          const totalRelationships = gameCount + tableEntryCount + (club.ligen?.length || 0);

          if (totalRelationships > maxRelationships) {
            maxRelationships = totalRelationships;
            keepClub = club;
          }
        }

        // Remove duplicates (keep the one with most relationships)
        for (const club of clubs) {
          if (club.id !== keepClub.id) {
            await this.strapi.entityService.delete('api::club.club', club.id);
            resolvedCount++;
            this.logOperation('cleanup_duplicate_club', 'success', {
              message: `Removed duplicate club: ${club.name} (ID: ${club.id})`,
              removedClubId: club.id,
              keptClubId: keepClub.id,
              clubName
            });
          }
        }
      }

      this.logOperation('cleanup_duplicate_clubs_summary', 'success', {
        message: `Resolved ${resolvedCount} duplicate clubs`,
        duplicateGroups: duplicateRows.length,
        resolved: resolvedCount
      });

    } catch (error) {
      this.logOperation('cleanup_duplicate_clubs', 'error', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Validate club data integrity
   */
  async validateClubDataIntegrity() {
    try {
      console.log('\n🔍 Validating club data integrity...');

      const issues = [];

      // Check for clubs without names
      const clubsWithoutNames = await this.strapi.db.query('api::club.club').count({
        where: {
          $or: [
            { name: { $null: true } },
            { name: '' }
          ]
        }
      });

      if (clubsWithoutNames > 0) {
        issues.push(`${clubsWithoutNames} clubs without names`);
      }

      // Check for viktoria clubs without team mapping
      const viktoriaClubsWithoutMapping = await this.strapi.db.query('api::club.club').count({
        where: {
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: { $null: true }
        }
      });

      if (viktoriaClubsWithoutMapping > 0) {
        issues.push(`${viktoriaClubsWithoutMapping} Viktoria clubs without team mapping`);
      }

      // Check for duplicate viktoria team mappings
      const mappingQuery = `
        SELECT viktoria_team_mapping, COUNT(*) as count
        FROM clubs 
        WHERE viktoria_team_mapping IS NOT NULL
        GROUP BY viktoria_team_mapping 
        HAVING COUNT(*) > 1
      `;

      const duplicateMappings = await this.strapi.db.connection.raw(mappingQuery);
      const duplicateMappingRows = duplicateMappings.rows || [];

      if (duplicateMappingRows.length > 0) {
        issues.push(`${duplicateMappingRows.length} duplicate viktoria team mappings`);
      }

      // Check for clubs referenced in games but marked as inactive
      const inactiveClubsInGames = await this.strapi.db.connection.raw(`
        SELECT DISTINCT c.id, c.name
        FROM clubs c
        JOIN spiele s ON (s.heim_club_id = c.id OR s.gast_club_id = c.id)
        WHERE c.aktiv = false
      `);

      const inactiveClubsInGamesRows = inactiveClubsInGames.rows || [];
      if (inactiveClubsInGamesRows.length > 0) {
        issues.push(`${inactiveClubsInGamesRows.length} inactive clubs still referenced in games`);
      }

      if (issues.length === 0) {
        this.logOperation('validate_club_data_integrity', 'success', {
          message: 'All club data integrity checks passed',
          issuesFound: 0
        });
      } else {
        this.logOperation('validate_club_data_integrity', 'warning', {
          message: `Found ${issues.length} data integrity issues`,
          issues,
          issuesFound: issues.length
        });
      }

    } catch (error) {
      this.logOperation('validate_club_data_integrity', 'error', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Clean up old calculation data
   */
  async cleanupOldCalculationData() {
    try {
      console.log('\n🗑️  Cleaning up old calculation data...');

      const retentionDays = parseInt(process.env.CLUB_DATA_RETENTION_DAYS || '90');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Clean up old table entries that are no longer relevant
      const oldTableEntries = await this.strapi.db.query('api::tabellen-eintrag.tabellen-eintrag').deleteMany({
        where: {
          last_updated: { $lt: cutoffDate },
          auto_calculated: true
        }
      });

      this.logOperation('cleanup_old_table_entries', 'success', {
        message: `Cleaned up ${oldTableEntries.count || 0} old table entries`,
        cutoffDate: cutoffDate.toISOString(),
        retentionDays,
        deletedCount: oldTableEntries.count || 0
      });

      // Clean up old game calculation metadata
      const updatedGames = await this.strapi.db.query('api::spiel.spiel').updateMany({
        where: {
          last_calculation: { $lt: cutoffDate }
        },
        data: {
          last_calculation: null,
          calculation_status: null,
          calculation_error: null
        }
      });

      this.logOperation('cleanup_old_game_metadata', 'success', {
        message: `Cleaned up calculation metadata from ${updatedGames.count || 0} old games`,
        cutoffDate: cutoffDate.toISOString(),
        updatedCount: updatedGames.count || 0
      });

    } catch (error) {
      this.logOperation('cleanup_old_calculation_data', 'error', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Optimize database performance
   */
  async optimizeDatabase() {
    try {
      console.log('\n⚡ Optimizing database performance...');

      // Analyze table statistics
      const tables = ['clubs', 'spiele', 'tabellen_eintraege'];
      
      for (const table of tables) {
        try {
          await this.strapi.db.connection.raw(`ANALYZE ${table}`);
          this.logOperation('analyze_table', 'success', {
            message: `Analyzed table statistics for ${table}`,
            table
          });
        } catch (error) {
          this.logOperation('analyze_table', 'error', {
            message: `Failed to analyze table ${table}: ${error.message}`,
            table,
            error: error.message
          });
        }
      }

      // Vacuum tables to reclaim space
      for (const table of tables) {
        try {
          await this.strapi.db.connection.raw(`VACUUM ${table}`);
          this.logOperation('vacuum_table', 'success', {
            message: `Vacuumed table ${table}`,
            table
          });
        } catch (error) {
          this.logOperation('vacuum_table', 'error', {
            message: `Failed to vacuum table ${table}: ${error.message}`,
            table,
            error: error.message
          });
        }
      }

      // Check index usage
      const indexUsageQuery = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        AND (tablename LIKE '%club%' OR tablename LIKE '%spiel%' OR tablename LIKE '%tabellen%')
        ORDER BY idx_tup_read DESC
      `;

      const indexUsage = await this.strapi.db.connection.raw(indexUsageQuery);
      const indexRows = indexUsage.rows || [];

      this.logOperation('check_index_usage', 'success', {
        message: `Checked usage for ${indexRows.length} indexes`,
        indexCount: indexRows.length,
        topIndexes: indexRows.slice(0, 5).map(row => ({
          table: row.tablename,
          index: row.indexname,
          reads: row.idx_tup_read
        }))
      });

    } catch (error) {
      this.logOperation('optimize_database', 'error', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Generate maintenance report
   */
  generateReport() {
    const summary = {
      totalOperations: this.results.operations.length,
      successfulOperations: this.results.operations.filter(op => op.status === 'success').length,
      warnings: this.results.warnings.length,
      errors: this.results.errors.length,
      duration: new Date().toISOString()
    };

    this.results.summary = summary;

    console.log('\n📊 Maintenance Report Summary:');
    console.log(`   Total Operations: ${summary.totalOperations}`);
    console.log(`   Successful: ${summary.successfulOperations}`);
    console.log(`   Warnings: ${summary.warnings}`);
    console.log(`   Errors: ${summary.errors}`);

    if (summary.errors > 0) {
      console.log('\n❌ Errors encountered:');
      this.results.errors.forEach(error => {
        console.log(`   - ${error.operation}: ${error.details.message}`);
      });
    }

    if (summary.warnings > 0) {
      console.log('\n⚠️  Warnings:');
      this.results.warnings.forEach(warning => {
        console.log(`   - ${warning.operation}: ${warning.details.message}`);
      });
    }

    return this.results;
  }

  /**
   * Save maintenance report to file
   */
  async saveReport() {
    try {
      const reportDir = path.join(__dirname, '..', 'logs', 'maintenance');
      await fs.mkdir(reportDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportFile = path.join(reportDir, `club-maintenance-${timestamp}.json`);

      await fs.writeFile(reportFile, JSON.stringify(this.results, null, 2));
      
      console.log(`\n💾 Maintenance report saved to: ${reportFile}`);
      return reportFile;

    } catch (error) {
      console.error('Failed to save maintenance report:', error.message);
      return null;
    }
  }

  /**
   * Run all maintenance operations
   */
  async runAll() {
    console.log('🚀 Starting club data maintenance...');
    
    await this.cleanupOrphanedClubs();
    await this.cleanupDuplicateClubs();
    await this.validateClubDataIntegrity();
    await this.cleanupOldCalculationData();
    await this.optimizeDatabase();
    
    const report = this.generateReport();
    await this.saveReport();
    
    console.log('\n✨ Club data maintenance completed!');
    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const operation = args[0] || 'all';

  let strapi;
  try {
    strapi = await initializeStrapi();
    const maintenance = new ClubMaintenanceManager(strapi);

    switch (operation) {
      case 'orphaned':
        await maintenance.cleanupOrphanedClubs();
        break;
      case 'duplicates':
        await maintenance.cleanupDuplicateClubs();
        break;
      case 'validate':
        await maintenance.validateClubDataIntegrity();
        break;
      case 'cleanup':
        await maintenance.cleanupOldCalculationData();
        break;
      case 'optimize':
        await maintenance.optimizeDatabase();
        break;
      case 'all':
      default:
        await maintenance.runAll();
        break;
    }

    maintenance.generateReport();
    await maintenance.saveReport();

  } catch (error) {
    console.error('Maintenance script failed:', error);
    process.exit(1);
  } finally {
    if (strapi) {
      await strapi.destroy();
    }
  }
}

// Export for programmatic use
module.exports = { ClubMaintenanceManager, initializeStrapi };

// Run if called directly
if (require.main === module) {
  main();
}