#!/usr/bin/env node

/**
 * Data Consistency Repair Tool
 * Repairs common data inconsistencies found during validation
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

class DataRepairTool {
  constructor(config) {
    this.config = config;
    this.client = new Client(config.database.connection);
    this.repairResults = {
      fixed: 0,
      skipped: 0,
      failed: 0,
      actions: []
    };
    this.dryRun = false;
  }

  async connect() {
    try {
      await this.client.connect();
      this.log('Connected to database', 'success');
    } catch (error) {
      this.error('Failed to connect to database:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await this.client.end();
    this.log('Disconnected from database', 'info');
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow
    };
    
    console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
  }

  error(message, details = '') {
    this.log(`${message} ${details}`, 'error');
  }

  warning(message, details = '') {
    this.log(`${message} ${details}`, 'warning');
  }

  addAction(type, description, query, affected = 0) {
    this.repairResults.actions.push({
      type,
      description,
      query,
      affected,
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun
    });
  }

  async executeRepair(description, query, confirmMessage) {
    try {
      this.log(`Checking: ${description}`);
      
      // First, check if repair is needed
      const checkResult = await this.client.query(query.check);
      const affectedCount = parseInt(checkResult.rows[0].count || checkResult.rows.length);
      
      if (affectedCount === 0) {
        this.log(`No issues found for: ${description}`, 'success');
        return true;
      }

      this.warning(`Found ${affectedCount} issues: ${description}`);

      if (!this.dryRun) {
        // Ask for confirmation
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `${confirmMessage} (${affectedCount} records affected)`,
          default: false
        }]);

        if (!confirm) {
          this.log('Skipped repair', 'warning');
          this.repairResults.skipped++;
          this.addAction('skipped', description, query.repair, affectedCount);
          return false;
        }
      }

      if (this.dryRun) {
        this.log(`[DRY RUN] Would execute: ${description}`, 'info');
        this.addAction('dry_run', description, query.repair, affectedCount);
        return true;
      }

      // Execute repair
      const repairResult = await this.client.query(query.repair);
      const repairedCount = repairResult.rowCount || affectedCount;
      
      this.log(`Repaired ${repairedCount} records: ${description}`, 'success');
      this.repairResults.fixed++;
      this.addAction('fixed', description, query.repair, repairedCount);
      
      return true;
    } catch (error) {
      this.error(`Failed to repair: ${description}`, error.message);
      this.repairResults.failed++;
      this.addAction('failed', description, query.repair, 0);
      return false;
    }
  }

  async repairInvalidSpielScores() {
    const description = 'Invalid spiel scores (negative or null for finished games)';
    const query = {
      check: `
        SELECT COUNT(*) as count
        FROM spiele 
        WHERE status = 'beendet' 
          AND (heim_tore < 0 OR gast_tore < 0 OR heim_tore IS NULL OR gast_tore IS NULL)
      `,
      repair: `
        UPDATE spiele 
        SET status = 'geplant',
            heim_tore = NULL,
            gast_tore = NULL
        WHERE status = 'beendet' 
          AND (heim_tore < 0 OR gast_tore < 0 OR heim_tore IS NULL OR gast_tore IS NULL)
      `
    };

    return await this.executeRepair(
      description,
      query,
      'Reset invalid finished games to planned status?'
    );
  }

  async repairSelfPlayingTeams() {
    const description = 'Games where team plays against itself';
    const query = {
      check: `
        SELECT COUNT(*) as count
        FROM spiele 
        WHERE heim_team_id = gast_team_id
      `,
      repair: `
        DELETE FROM spiele 
        WHERE heim_team_id = gast_team_id
      `
    };

    return await this.executeRepair(
      description,
      query,
      'Delete games where team plays against itself?'
    );
  }

  async repairNegativeTableValues() {
    const description = 'Negative values in table entries';
    const query = {
      check: `
        SELECT COUNT(*) as count
        FROM tabellen_eintraege 
        WHERE punkte < 0 OR spiele < 0 OR siege < 0 OR unentschieden < 0 
           OR niederlagen < 0 OR tore_fuer < 0 OR tore_gegen < 0
      `,
      repair: `
        UPDATE tabellen_eintraege 
        SET punkte = GREATEST(punkte, 0),
            spiele = GREATEST(spiele, 0),
            siege = GREATEST(siege, 0),
            unentschieden = GREATEST(unentschieden, 0),
            niederlagen = GREATEST(niederlagen, 0),
            tore_fuer = GREATEST(tore_fuer, 0),
            tore_gegen = GREATEST(tore_gegen, 0),
            tordifferenz = tore_fuer - tore_gegen
        WHERE punkte < 0 OR spiele < 0 OR siege < 0 OR unentschieden < 0 
           OR niederlagen < 0 OR tore_fuer < 0 OR tore_gegen < 0
      `
    };

    return await this.executeRepair(
      description,
      query,
      'Fix negative values in table entries?'
    );
  }

  async repairMathematicalInconsistencies() {
    const description = 'Mathematical inconsistencies in table entries';
    const query = {
      check: `
        SELECT COUNT(*) as count
        FROM tabellen_eintraege 
        WHERE spiele != (siege + unentschieden + niederlagen)
           OR tordifferenz != (tore_fuer - tore_gegen)
           OR punkte != (siege * 3 + unentschieden * 1)
      `,
      repair: `
        UPDATE tabellen_eintraege 
        SET tordifferenz = tore_fuer - tore_gegen,
            punkte = siege * 3 + unentschieden * 1
        WHERE spiele != (siege + unentschieden + niederlagen)
           OR tordifferenz != (tore_fuer - tore_gegen)
           OR punkte != (siege * 3 + unentschieden * 1)
      `
    };

    return await this.executeRepair(
      description,
      query,
      'Fix mathematical inconsistencies in table entries?'
    );
  }

  async repairDuplicateTableEntries() {
    const description = 'Duplicate table entries';
    const query = {
      check: `
        SELECT COUNT(*) as count
        FROM (
          SELECT team_id, liga_id, saison_id, COUNT(*) as cnt
          FROM tabellen_eintraege 
          GROUP BY team_id, liga_id, saison_id
          HAVING COUNT(*) > 1
        ) duplicates
      `,
      repair: `
        DELETE FROM tabellen_eintraege 
        WHERE id NOT IN (
          SELECT MIN(id)
          FROM tabellen_eintraege 
          GROUP BY team_id, liga_id, saison_id
        )
      `
    };

    return await this.executeRepair(
      description,
      query,
      'Remove duplicate table entries (keep first entry)?'
    );
  }

  async repairOrphanedRecords() {
    const description = 'Orphaned records (referencing non-existent entities)';
    
    // Check and repair orphaned spiele
    const spieleQuery = {
      check: `
        SELECT COUNT(*) as count
        FROM spiele s
        WHERE s.heim_team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
           OR s.gast_team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
           OR s.liga_id NOT IN (SELECT id FROM ligas WHERE id IS NOT NULL)
           OR s.saison_id NOT IN (SELECT id FROM saisons WHERE id IS NOT NULL)
      `,
      repair: `
        DELETE FROM spiele s
        WHERE s.heim_team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
           OR s.gast_team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
           OR s.liga_id NOT IN (SELECT id FROM ligas WHERE id IS NOT NULL)
           OR s.saison_id NOT IN (SELECT id FROM saisons WHERE id IS NOT NULL)
      `
    };

    const spieleResult = await this.executeRepair(
      'Orphaned spiele records',
      spieleQuery,
      'Delete orphaned spiele records?'
    );

    // Check and repair orphaned tabellen_eintraege
    const tabellenQuery = {
      check: `
        SELECT COUNT(*) as count
        FROM tabellen_eintraege te
        WHERE te.team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
           OR te.liga_id NOT IN (SELECT id FROM ligas WHERE id IS NOT NULL)
           OR te.saison_id NOT IN (SELECT id FROM saisons WHERE id IS NOT NULL)
      `,
      repair: `
        DELETE FROM tabellen_eintraege te
        WHERE te.team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
           OR te.liga_id NOT IN (SELECT id FROM ligas WHERE id IS NOT NULL)
           OR te.saison_id NOT IN (SELECT id FROM saisons WHERE id IS NOT NULL)
      `
    };

    const tabellenResult = await this.executeRepair(
      'Orphaned tabellen_eintraege records',
      tabellenQuery,
      'Delete orphaned table entries?'
    );

    return spieleResult && tabellenResult;
  }

  async recalculateAllTables() {
    const description = 'Recalculate all table entries from game results';
    
    try {
      this.log('Recalculating all table entries from game results...');

      if (!this.dryRun) {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'This will recalculate ALL table entries. Continue?',
          default: false
        }]);

        if (!confirm) {
          this.log('Skipped table recalculation', 'warning');
          this.repairResults.skipped++;
          return false;
        }
      }

      if (this.dryRun) {
        this.log('[DRY RUN] Would recalculate all table entries', 'info');
        this.addAction('dry_run', description, 'Complex recalculation query', 0);
        return true;
      }

      // Begin transaction
      await this.client.query('BEGIN');

      try {
        // Get all unique team/liga/saison combinations
        const combinations = await this.client.query(`
          SELECT DISTINCT 
            COALESCE(heim_team_id, gast_team_id) as team_id,
            liga_id,
            saison_id
          FROM spiele
          WHERE heim_team_id IS NOT NULL OR gast_team_id IS NOT NULL
        `);

        let updatedCount = 0;

        for (const combo of combinations.rows) {
          // Calculate stats for this team/liga/saison
          const stats = await this.client.query(`
            WITH heim_stats AS (
              SELECT 
                COUNT(*) as spiele,
                SUM(CASE WHEN heim_tore > gast_tore THEN 1 ELSE 0 END) as siege,
                SUM(CASE WHEN heim_tore = gast_tore THEN 1 ELSE 0 END) as unentschieden,
                SUM(CASE WHEN heim_tore < gast_tore THEN 1 ELSE 0 END) as niederlagen,
                SUM(heim_tore) as tore_fuer,
                SUM(gast_tore) as tore_gegen,
                SUM(CASE WHEN heim_tore > gast_tore THEN 3 WHEN heim_tore = gast_tore THEN 1 ELSE 0 END) as punkte
              FROM spiele 
              WHERE heim_team_id = $1 AND liga_id = $2 AND saison_id = $3 
                AND status = 'beendet' AND heim_tore IS NOT NULL AND gast_tore IS NOT NULL
            ),
            gast_stats AS (
              SELECT 
                COUNT(*) as spiele,
                SUM(CASE WHEN gast_tore > heim_tore THEN 1 ELSE 0 END) as siege,
                SUM(CASE WHEN gast_tore = heim_tore THEN 1 ELSE 0 END) as unentschieden,
                SUM(CASE WHEN gast_tore < heim_tore THEN 1 ELSE 0 END) as niederlagen,
                SUM(gast_tore) as tore_fuer,
                SUM(heim_tore) as tore_gegen,
                SUM(CASE WHEN gast_tore > heim_tore THEN 3 WHEN gast_tore = heim_tore THEN 1 ELSE 0 END) as punkte
              FROM spiele 
              WHERE gast_team_id = $1 AND liga_id = $2 AND saison_id = $3 
                AND status = 'beendet' AND heim_tore IS NOT NULL AND gast_tore IS NOT NULL
            )
            SELECT 
              COALESCE(h.spiele, 0) + COALESCE(g.spiele, 0) as spiele,
              COALESCE(h.siege, 0) + COALESCE(g.siege, 0) as siege,
              COALESCE(h.unentschieden, 0) + COALESCE(g.unentschieden, 0) as unentschieden,
              COALESCE(h.niederlagen, 0) + COALESCE(g.niederlagen, 0) as niederlagen,
              COALESCE(h.tore_fuer, 0) + COALESCE(g.tore_fuer, 0) as tore_fuer,
              COALESCE(h.tore_gegen, 0) + COALESCE(g.tore_gegen, 0) as tore_gegen,
              COALESCE(h.punkte, 0) + COALESCE(g.punkte, 0) as punkte
            FROM heim_stats h
            FULL OUTER JOIN gast_stats g ON true
          `, [combo.team_id, combo.liga_id, combo.saison_id]);

          if (stats.rows.length > 0) {
            const stat = stats.rows[0];
            const tordifferenz = parseInt(stat.tore_fuer) - parseInt(stat.tore_gegen);

            // Update or insert table entry
            await this.client.query(`
              INSERT INTO tabellen_eintraege (
                team_id, liga_id, saison_id, spiele, siege, unentschieden, 
                niederlagen, tore_fuer, tore_gegen, tordifferenz, punkte,
                auto_calculated, last_updated
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, CURRENT_TIMESTAMP)
              ON CONFLICT (team_id, liga_id, saison_id) 
              DO UPDATE SET
                spiele = EXCLUDED.spiele,
                siege = EXCLUDED.siege,
                unentschieden = EXCLUDED.unentschieden,
                niederlagen = EXCLUDED.niederlagen,
                tore_fuer = EXCLUDED.tore_fuer,
                tore_gegen = EXCLUDED.tore_gegen,
                tordifferenz = EXCLUDED.tordifferenz,
                punkte = EXCLUDED.punkte,
                auto_calculated = true,
                last_updated = CURRENT_TIMESTAMP
            `, [
              combo.team_id, combo.liga_id, combo.saison_id,
              stat.spiele, stat.siege, stat.unentschieden, stat.niederlagen,
              stat.tore_fuer, stat.tore_gegen, tordifferenz, stat.punkte
            ]);

            updatedCount++;
          }
        }

        // Commit transaction
        await this.client.query('COMMIT');

        this.log(`Recalculated ${updatedCount} table entries`, 'success');
        this.repairResults.fixed++;
        this.addAction('fixed', description, 'Table recalculation', updatedCount);

        return true;
      } catch (error) {
        // Rollback transaction
        await this.client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      this.error(`Failed to recalculate tables: ${error.message}`);
      this.repairResults.failed++;
      this.addAction('failed', description, 'Table recalculation', 0);
      return false;
    }
  }

  async runAllRepairs() {
    this.log(`Starting data repair process (${this.dryRun ? 'DRY RUN' : 'LIVE'})...`, 'info');

    const repairs = [
      () => this.repairInvalidSpielScores(),
      () => this.repairSelfPlayingTeams(),
      () => this.repairOrphanedRecords(),
      () => this.repairDuplicateTableEntries(),
      () => this.repairNegativeTableValues(),
      () => this.repairMathematicalInconsistencies(),
      () => this.recalculateAllTables()
    ];

    for (const repair of repairs) {
      await repair();
    }

    this.printSummary();
    return this.repairResults;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.cyan(`DATA REPAIR SUMMARY ${this.dryRun ? '(DRY RUN)' : ''}`));
    console.log('='.repeat(60));

    console.log(chalk.green(`✓ Fixed: ${this.repairResults.fixed}`));
    console.log(chalk.yellow(`⚠ Skipped: ${this.repairResults.skipped}`));
    console.log(chalk.red(`✗ Failed: ${this.repairResults.failed}`));

    if (this.repairResults.actions.length > 0) {
      console.log('\n' + chalk.cyan('ACTIONS TAKEN:'));
      
      this.repairResults.actions.forEach(action => {
        const color = action.type === 'fixed' ? chalk.green : 
                     action.type === 'skipped' ? chalk.yellow : 
                     action.type === 'failed' ? chalk.red : chalk.blue;
        
        console.log(color(`  ${action.type.toUpperCase()}: ${action.description}`));
        if (action.affected > 0) {
          console.log(color(`    Affected: ${action.affected} records`));
        }
      });
    }

    console.log('\n' + (this.repairResults.failed === 0 ? 
      chalk.green('🎉 DATA REPAIR COMPLETED') : 
      chalk.red('❌ SOME REPAIRS FAILED')
    ));
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      dryRun: this.dryRun,
      summary: {
        fixed: this.repairResults.fixed,
        skipped: this.repairResults.skipped,
        failed: this.repairResults.failed,
        success: this.repairResults.failed === 0
      },
      actions: this.repairResults.actions
    };

    const reportPath = path.join(__dirname, '..', 'logs', `data-repair-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`Repair report saved to: ${reportPath}`, 'info');
    return reportPath;
  }
}

// CLI Interface
async function main() {
  const environment = process.env.NODE_ENV || 'development';
  const dryRun = process.argv.includes('--dry-run');
  
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
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const repairTool = new DataRepairTool(config);
  repairTool.dryRun = dryRun;

  if (dryRun) {
    console.log(chalk.yellow('Running in DRY RUN mode - no changes will be made'));
  }

  try {
    await repairTool.connect();
    const results = await repairTool.runAllRepairs();
    await repairTool.generateReport();

    process.exit(results.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('Repair failed:'), error.message);
    process.exit(1);
  } finally {
    await repairTool.disconnect();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Unhandled error:'), error);
    process.exit(1);
  });
}

module.exports = DataRepairTool;