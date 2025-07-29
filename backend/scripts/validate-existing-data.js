#!/usr/bin/env node

/**
 * Existing Data Validation Script
 * Validates existing table data for consistency and integrity before migration
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class DataValidator {
  constructor(config) {
    this.config = config;
    this.client = new Client(config.database.connection);
    this.validationResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      issues: []
    };
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

  addIssue(type, severity, table, description, count = 0, query = '') {
    this.validationResults.issues.push({
      type,
      severity,
      table,
      description,
      count,
      query,
      timestamp: new Date().toISOString()
    });

    if (severity === 'error') {
      this.validationResults.failed++;
    } else if (severity === 'warning') {
      this.validationResults.warnings++;
    } else {
      this.validationResults.passed++;
    }
  }

  async validateSpielData() {
    this.log('Validating spiel data...');

    try {
      // Check for games with invalid scores
      const invalidScores = await this.client.query(`
        SELECT COUNT(*) as count, 
               array_agg(id) as game_ids
        FROM spiele 
        WHERE status = 'beendet' 
          AND (heim_tore < 0 OR gast_tore < 0 OR heim_tore IS NULL OR gast_tore IS NULL)
      `);

      if (parseInt(invalidScores.rows[0].count) > 0) {
        this.addIssue(
          'data_integrity',
          'error',
          'spiele',
          'Games marked as finished but missing or invalid scores',
          parseInt(invalidScores.rows[0].count),
          'SELECT * FROM spiele WHERE status = \'beendet\' AND (heim_tore < 0 OR gast_tore < 0 OR heim_tore IS NULL OR gast_tore IS NULL)'
        );
      }

      // Check for games where team plays against itself
      const selfGames = await this.client.query(`
        SELECT COUNT(*) as count,
               array_agg(id) as game_ids
        FROM spiele 
        WHERE heim_team_id = gast_team_id
      `);

      if (parseInt(selfGames.rows[0].count) > 0) {
        this.addIssue(
          'data_integrity',
          'error',
          'spiele',
          'Games where team plays against itself',
          parseInt(selfGames.rows[0].count),
          'SELECT * FROM spiele WHERE heim_team_id = gast_team_id'
        );
      }

      // Check for orphaned games (teams don't exist)
      const orphanedGames = await this.client.query(`
        SELECT COUNT(*) as count
        FROM spiele s
        WHERE s.heim_team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
           OR s.gast_team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
      `);

      if (parseInt(orphanedGames.rows[0].count) > 0) {
        this.addIssue(
          'referential_integrity',
          'error',
          'spiele',
          'Games referencing non-existent teams',
          parseInt(orphanedGames.rows[0].count),
          'SELECT * FROM spiele s WHERE s.heim_team_id NOT IN (SELECT id FROM teams) OR s.gast_team_id NOT IN (SELECT id FROM teams)'
        );
      }

      // Check for games with invalid spieltag
      const invalidSpieltag = await this.client.query(`
        SELECT COUNT(*) as count
        FROM spiele 
        WHERE spieltag < 1 OR spieltag > 34
      `);

      if (parseInt(invalidSpieltag.rows[0].count) > 0) {
        this.addIssue(
          'data_integrity',
          'warning',
          'spiele',
          'Games with invalid spieltag (not between 1-34)',
          parseInt(invalidSpieltag.rows[0].count),
          'SELECT * FROM spiele WHERE spieltag < 1 OR spieltag > 34'
        );
      }

      // Check for duplicate games
      const duplicateGames = await this.client.query(`
        SELECT heim_team_id, gast_team_id, liga_id, saison_id, spieltag, COUNT(*) as count
        FROM spiele 
        GROUP BY heim_team_id, gast_team_id, liga_id, saison_id, spieltag
        HAVING COUNT(*) > 1
      `);

      if (duplicateGames.rows.length > 0) {
        this.addIssue(
          'data_integrity',
          'warning',
          'spiele',
          'Duplicate games found',
          duplicateGames.rows.length,
          'SELECT heim_team_id, gast_team_id, liga_id, saison_id, spieltag, COUNT(*) FROM spiele GROUP BY heim_team_id, gast_team_id, liga_id, saison_id, spieltag HAVING COUNT(*) > 1'
        );
      }

      this.log('Spiel data validation completed', 'success');
    } catch (error) {
      this.error('Failed to validate spiel data:', error.message);
      this.addIssue('validation_error', 'error', 'spiele', `Validation failed: ${error.message}`);
    }
  }

  async validateTabellenEintragData() {
    this.log('Validating tabellen_eintrag data...');

    try {
      // Check for negative values
      const negativeValues = await this.client.query(`
        SELECT COUNT(*) as count
        FROM tabellen_eintraege 
        WHERE punkte < 0 OR spiele < 0 OR siege < 0 OR unentschieden < 0 
           OR niederlagen < 0 OR tore_fuer < 0 OR tore_gegen < 0
      `);

      if (parseInt(negativeValues.rows[0].count) > 0) {
        this.addIssue(
          'data_integrity',
          'error',
          'tabellen_eintraege',
          'Table entries with negative values',
          parseInt(negativeValues.rows[0].count),
          'SELECT * FROM tabellen_eintraege WHERE punkte < 0 OR spiele < 0 OR siege < 0 OR unentschieden < 0 OR niederlagen < 0 OR tore_fuer < 0 OR tore_gegen < 0'
        );
      }

      // Check for mathematical inconsistencies
      const mathInconsistencies = await this.client.query(`
        SELECT COUNT(*) as count
        FROM tabellen_eintraege 
        WHERE spiele != (siege + unentschieden + niederlagen)
           OR tordifferenz != (tore_fuer - tore_gegen)
           OR punkte != (siege * 3 + unentschieden * 1)
      `);

      if (parseInt(mathInconsistencies.rows[0].count) > 0) {
        this.addIssue(
          'calculation_error',
          'error',
          'tabellen_eintraege',
          'Table entries with mathematical inconsistencies',
          parseInt(mathInconsistencies.rows[0].count),
          'SELECT * FROM tabellen_eintraege WHERE spiele != (siege + unentschieden + niederlagen) OR tordifferenz != (tore_fuer - tore_gegen) OR punkte != (siege * 3 + unentschieden * 1)'
        );
      }

      // Check for orphaned table entries (teams don't exist)
      const orphanedEntries = await this.client.query(`
        SELECT COUNT(*) as count
        FROM tabellen_eintraege te
        WHERE te.team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
      `);

      if (parseInt(orphanedEntries.rows[0].count) > 0) {
        this.addIssue(
          'referential_integrity',
          'error',
          'tabellen_eintraege',
          'Table entries referencing non-existent teams',
          parseInt(orphanedEntries.rows[0].count),
          'SELECT * FROM tabellen_eintraege te WHERE te.team_id NOT IN (SELECT id FROM teams)'
        );
      }

      // Check for duplicate entries
      const duplicateEntries = await this.client.query(`
        SELECT team_id, liga_id, saison_id, COUNT(*) as count
        FROM tabellen_eintraege 
        GROUP BY team_id, liga_id, saison_id
        HAVING COUNT(*) > 1
      `);

      if (duplicateEntries.rows.length > 0) {
        this.addIssue(
          'data_integrity',
          'error',
          'tabellen_eintraege',
          'Duplicate table entries found',
          duplicateEntries.rows.length,
          'SELECT team_id, liga_id, saison_id, COUNT(*) FROM tabellen_eintraege GROUP BY team_id, liga_id, saison_id HAVING COUNT(*) > 1'
        );
      }

      this.log('Tabellen_eintrag data validation completed', 'success');
    } catch (error) {
      this.error('Failed to validate tabellen_eintrag data:', error.message);
      this.addIssue('validation_error', 'error', 'tabellen_eintraege', `Validation failed: ${error.message}`);
    }
  }

  async validateDataConsistency() {
    this.log('Validating data consistency between tables...');

    try {
      // Check if calculated table data matches actual game results
      const inconsistentData = await this.client.query(`
        WITH calculated_stats AS (
          SELECT 
            COALESCE(heim_stats.team_id, gast_stats.team_id) as team_id,
            COALESCE(heim_stats.liga_id, gast_stats.liga_id) as liga_id,
            COALESCE(heim_stats.saison_id, gast_stats.saison_id) as saison_id,
            COALESCE(heim_stats.spiele, 0) + COALESCE(gast_stats.spiele, 0) as calculated_spiele,
            COALESCE(heim_stats.siege, 0) + COALESCE(gast_stats.siege, 0) as calculated_siege,
            COALESCE(heim_stats.unentschieden, 0) + COALESCE(gast_stats.unentschieden, 0) as calculated_unentschieden,
            COALESCE(heim_stats.niederlagen, 0) + COALESCE(gast_stats.niederlagen, 0) as calculated_niederlagen,
            COALESCE(heim_stats.tore_fuer, 0) + COALESCE(gast_stats.tore_fuer, 0) as calculated_tore_fuer,
            COALESCE(heim_stats.tore_gegen, 0) + COALESCE(gast_stats.tore_gegen, 0) as calculated_tore_gegen,
            COALESCE(heim_stats.punkte, 0) + COALESCE(gast_stats.punkte, 0) as calculated_punkte
          FROM (
            SELECT 
              heim_team_id as team_id,
              liga_id,
              saison_id,
              COUNT(*) as spiele,
              SUM(CASE WHEN heim_tore > gast_tore THEN 1 ELSE 0 END) as siege,
              SUM(CASE WHEN heim_tore = gast_tore THEN 1 ELSE 0 END) as unentschieden,
              SUM(CASE WHEN heim_tore < gast_tore THEN 1 ELSE 0 END) as niederlagen,
              SUM(heim_tore) as tore_fuer,
              SUM(gast_tore) as tore_gegen,
              SUM(CASE WHEN heim_tore > gast_tore THEN 3 WHEN heim_tore = gast_tore THEN 1 ELSE 0 END) as punkte
            FROM spiele 
            WHERE status = 'beendet' AND heim_tore IS NOT NULL AND gast_tore IS NOT NULL
            GROUP BY heim_team_id, liga_id, saison_id
          ) heim_stats
          FULL OUTER JOIN (
            SELECT 
              gast_team_id as team_id,
              liga_id,
              saison_id,
              COUNT(*) as spiele,
              SUM(CASE WHEN gast_tore > heim_tore THEN 1 ELSE 0 END) as siege,
              SUM(CASE WHEN gast_tore = heim_tore THEN 1 ELSE 0 END) as unentschieden,
              SUM(CASE WHEN gast_tore < heim_tore THEN 1 ELSE 0 END) as niederlagen,
              SUM(gast_tore) as tore_fuer,
              SUM(heim_tore) as tore_gegen,
              SUM(CASE WHEN gast_tore > heim_tore THEN 3 WHEN gast_tore = heim_tore THEN 1 ELSE 0 END) as punkte
            FROM spiele 
            WHERE status = 'beendet' AND heim_tore IS NOT NULL AND gast_tore IS NOT NULL
            GROUP BY gast_team_id, liga_id, saison_id
          ) gast_stats ON heim_stats.team_id = gast_stats.team_id 
                        AND heim_stats.liga_id = gast_stats.liga_id 
                        AND heim_stats.saison_id = gast_stats.saison_id
        )
        SELECT COUNT(*) as count
        FROM calculated_stats cs
        JOIN tabellen_eintraege te ON cs.team_id = te.team_id 
                                   AND cs.liga_id = te.liga_id 
                                   AND cs.saison_id = te.saison_id
        WHERE cs.calculated_spiele != te.spiele
           OR cs.calculated_siege != te.siege
           OR cs.calculated_unentschieden != te.unentschieden
           OR cs.calculated_niederlagen != te.niederlagen
           OR cs.calculated_tore_fuer != te.tore_fuer
           OR cs.calculated_tore_gegen != te.tore_gegen
           OR cs.calculated_punkte != te.punkte
      `);

      if (parseInt(inconsistentData.rows[0].count) > 0) {
        this.addIssue(
          'calculation_error',
          'error',
          'data_consistency',
          'Table entries do not match calculated values from games',
          parseInt(inconsistentData.rows[0].count),
          'Complex query - see validation report for details'
        );
      }

      this.log('Data consistency validation completed', 'success');
    } catch (error) {
      this.error('Failed to validate data consistency:', error.message);
      this.addIssue('validation_error', 'error', 'data_consistency', `Validation failed: ${error.message}`);
    }
  }

  async validateReferentialIntegrity() {
    this.log('Validating referential integrity...');

    try {
      // Check for missing teams
      const missingTeams = await this.client.query(`
        SELECT DISTINCT team_id
        FROM tabellen_eintraege te
        WHERE te.team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
        UNION
        SELECT DISTINCT heim_team_id as team_id
        FROM spiele s
        WHERE s.heim_team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
        UNION
        SELECT DISTINCT gast_team_id as team_id
        FROM spiele s
        WHERE s.gast_team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
      `);

      if (missingTeams.rows.length > 0) {
        this.addIssue(
          'referential_integrity',
          'error',
          'teams',
          'Referenced teams do not exist',
          missingTeams.rows.length,
          'SELECT DISTINCT team_id FROM tabellen_eintraege WHERE team_id NOT IN (SELECT id FROM teams)'
        );
      }

      // Check for missing leagues
      const missingLigas = await this.client.query(`
        SELECT DISTINCT liga_id
        FROM tabellen_eintraege te
        WHERE te.liga_id NOT IN (SELECT id FROM ligas WHERE id IS NOT NULL)
        UNION
        SELECT DISTINCT liga_id
        FROM spiele s
        WHERE s.liga_id NOT IN (SELECT id FROM ligas WHERE id IS NOT NULL)
      `);

      if (missingLigas.rows.length > 0) {
        this.addIssue(
          'referential_integrity',
          'error',
          'ligas',
          'Referenced leagues do not exist',
          missingLigas.rows.length,
          'SELECT DISTINCT liga_id FROM tabellen_eintraege WHERE liga_id NOT IN (SELECT id FROM ligas)'
        );
      }

      // Check for missing seasons
      const missingSaisons = await this.client.query(`
        SELECT DISTINCT saison_id
        FROM tabellen_eintraege te
        WHERE te.saison_id NOT IN (SELECT id FROM saisons WHERE id IS NOT NULL)
        UNION
        SELECT DISTINCT saison_id
        FROM spiele s
        WHERE s.saison_id NOT IN (SELECT id FROM saisons WHERE id IS NOT NULL)
      `);

      if (missingSaisons.rows.length > 0) {
        this.addIssue(
          'referential_integrity',
          'error',
          'saisons',
          'Referenced seasons do not exist',
          missingSaisons.rows.length,
          'SELECT DISTINCT saison_id FROM tabellen_eintraege WHERE saison_id NOT IN (SELECT id FROM saisons)'
        );
      }

      this.log('Referential integrity validation completed', 'success');
    } catch (error) {
      this.error('Failed to validate referential integrity:', error.message);
      this.addIssue('validation_error', 'error', 'referential_integrity', `Validation failed: ${error.message}`);
    }
  }

  async runAllValidations() {
    this.log('Starting comprehensive data validation...', 'info');

    await this.validateSpielData();
    await this.validateTabellenEintragData();
    await this.validateDataConsistency();
    await this.validateReferentialIntegrity();

    this.printSummary();
    return this.validationResults;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.cyan('DATA VALIDATION SUMMARY'));
    console.log('='.repeat(60));

    console.log(chalk.green(`✓ Passed: ${this.validationResults.passed}`));
    console.log(chalk.red(`✗ Failed: ${this.validationResults.failed}`));
    console.log(chalk.yellow(`⚠ Warnings: ${this.validationResults.warnings}`));

    if (this.validationResults.issues.length > 0) {
      console.log('\n' + chalk.cyan('ISSUES FOUND:'));
      
      const errorIssues = this.validationResults.issues.filter(issue => issue.severity === 'error');
      const warningIssues = this.validationResults.issues.filter(issue => issue.severity === 'warning');

      if (errorIssues.length > 0) {
        console.log('\n' + chalk.red('ERRORS:'));
        errorIssues.forEach(issue => {
          console.log(chalk.red(`  ✗ [${issue.table}] ${issue.description}`));
          if (issue.count > 0) {
            console.log(chalk.red(`    Count: ${issue.count}`));
          }
        });
      }

      if (warningIssues.length > 0) {
        console.log('\n' + chalk.yellow('WARNINGS:'));
        warningIssues.forEach(issue => {
          console.log(chalk.yellow(`  ⚠ [${issue.table}] ${issue.description}`));
          if (issue.count > 0) {
            console.log(chalk.yellow(`    Count: ${issue.count}`));
          }
        });
      }
    }

    console.log('\n' + (this.validationResults.failed === 0 ? 
      chalk.green('🎉 DATA VALIDATION PASSED') : 
      chalk.red('❌ DATA VALIDATION FAILED')
    ));
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      summary: {
        passed: this.validationResults.passed,
        failed: this.validationResults.failed,
        warnings: this.validationResults.warnings,
        success: this.validationResults.failed === 0
      },
      issues: this.validationResults.issues
    };

    const reportPath = path.join(__dirname, '..', 'logs', `data-validation-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`Validation report saved to: ${reportPath}`, 'info');
    return reportPath;
  }
}

// CLI Interface
async function main() {
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
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const validator = new DataValidator(config);

  try {
    await validator.connect();
    const results = await validator.runAllValidations();
    await validator.generateReport();

    process.exit(results.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('Validation failed:'), error.message);
    process.exit(1);
  } finally {
    await validator.disconnect();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Unhandled error:'), error);
    process.exit(1);
  });
}

module.exports = DataValidator;