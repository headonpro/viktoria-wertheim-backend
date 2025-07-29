#!/usr/bin/env node

/**
 * Data Integrity Validation Report Generator
 * Generates comprehensive reports on data integrity and system health
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class ValidationReportGenerator {
  constructor(config) {
    this.config = config;
    this.client = new Client(config.database.connection);
    this.reportData = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      summary: {
        totalChecks: 0,
        passed: 0,
        warnings: 0,
        errors: 0
      },
      sections: []
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

  addCheck(section, name, status, message, count = 0, details = null) {
    if (!this.reportData.sections.find(s => s.name === section)) {
      this.reportData.sections.push({
        name: section,
        checks: []
      });
    }

    const sectionObj = this.reportData.sections.find(s => s.name === section);
    sectionObj.checks.push({
      name,
      status,
      message,
      count,
      details,
      timestamp: new Date().toISOString()
    });

    this.reportData.summary.totalChecks++;
    if (status === 'passed') this.reportData.summary.passed++;
    else if (status === 'warning') this.reportData.summary.warnings++;
    else if (status === 'error') this.reportData.summary.errors++;
  }

  async generateDatabaseOverview() {
    this.log('Generating database overview...');

    try {
      // Get table counts
      const tableCounts = await this.client.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      // Get database size
      const dbSize = await this.client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);

      // Get index usage
      const indexUsage = await this.client.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_tup_read DESC
        LIMIT 10
      `);

      this.addCheck('Database Overview', 'Table Statistics', 'passed', 
        `Found ${tableCounts.rows.length} tables`, tableCounts.rows.length, {
          tables: tableCounts.rows,
          database_size: dbSize.rows[0].size,
          top_indexes: indexUsage.rows
        });

    } catch (error) {
      this.addCheck('Database Overview', 'Database Statistics', 'error', 
        `Failed to get database overview: ${error.message}`);
    }
  }

  async generateDataIntegrityReport() {
    this.log('Generating data integrity report...');

    try {
      // Check spiele data integrity
      const spieleChecks = [
        {
          name: 'Invalid Scores',
          query: `
            SELECT COUNT(*) as count, array_agg(id ORDER BY id LIMIT 10) as sample_ids
            FROM spiele 
            WHERE status = 'beendet' 
              AND (heim_tore < 0 OR gast_tore < 0 OR heim_tore IS NULL OR gast_tore IS NULL)
          `
        },
        {
          name: 'Self-Playing Teams',
          query: `
            SELECT COUNT(*) as count, array_agg(id ORDER BY id LIMIT 10) as sample_ids
            FROM spiele 
            WHERE heim_team_id = gast_team_id
          `
        },
        {
          name: 'Orphaned Games',
          query: `
            SELECT COUNT(*) as count
            FROM spiele s
            WHERE s.heim_team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
               OR s.gast_team_id NOT IN (SELECT id FROM teams WHERE id IS NOT NULL)
          `
        },
        {
          name: 'Invalid Spieltag',
          query: `
            SELECT COUNT(*) as count, array_agg(id ORDER BY id LIMIT 10) as sample_ids
            FROM spiele 
            WHERE spieltag < 1 OR spieltag > 34
          `
        }
      ];

      for (const check of spieleChecks) {
        const result = await this.client.query(check.query);
        const count = parseInt(result.rows[0].count);
        
        if (count === 0) {
          this.addCheck('Spiele Data Integrity', check.name, 'passed', 'No issues found');
        } else if (count < 10) {
          this.addCheck('Spiele Data Integrity', check.name, 'warning', 
            `Found ${count} issues`, count, result.rows[0]);
        } else {
          this.addCheck('Spiele Data Integrity', check.name, 'error', 
            `Found ${count} issues`, count, result.rows[0]);
        }
      }

      // Check tabellen_eintraege data integrity
      const tabellenChecks = [
        {
          name: 'Negative Values',
          query: `
            SELECT COUNT(*) as count, array_agg(id ORDER BY id LIMIT 10) as sample_ids
            FROM tabellen_eintraege 
            WHERE punkte < 0 OR spiele < 0 OR siege < 0 OR unentschieden < 0 
               OR niederlagen < 0 OR tore_fuer < 0 OR tore_gegen < 0
          `
        },
        {
          name: 'Mathematical Inconsistencies',
          query: `
            SELECT COUNT(*) as count, array_agg(id ORDER BY id LIMIT 10) as sample_ids
            FROM tabellen_eintraege 
            WHERE spiele != (siege + unentschieden + niederlagen)
               OR tordifferenz != (tore_fuer - tore_gegen)
               OR punkte != (siege * 3 + unentschieden * 1)
          `
        },
        {
          name: 'Duplicate Entries',
          query: `
            SELECT COUNT(*) as count
            FROM (
              SELECT team_id, liga_id, saison_id, COUNT(*) as cnt
              FROM tabellen_eintraege 
              GROUP BY team_id, liga_id, saison_id
              HAVING COUNT(*) > 1
            ) duplicates
          `
        }
      ];

      for (const check of tabellenChecks) {
        const result = await this.client.query(check.query);
        const count = parseInt(result.rows[0].count);
        
        if (count === 0) {
          this.addCheck('Tabellen Data Integrity', check.name, 'passed', 'No issues found');
        } else if (count < 5) {
          this.addCheck('Tabellen Data Integrity', check.name, 'warning', 
            `Found ${count} issues`, count, result.rows[0]);
        } else {
          this.addCheck('Tabellen Data Integrity', check.name, 'error', 
            `Found ${count} issues`, count, result.rows[0]);
        }
      }

    } catch (error) {
      this.addCheck('Data Integrity', 'Integrity Checks', 'error', 
        `Failed to run integrity checks: ${error.message}`);
    }
  }

  async generateCalculationAccuracyReport() {
    this.log('Generating calculation accuracy report...');

    try {
      // Compare calculated vs stored values
      const accuracyCheck = await this.client.query(`
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
        ),
        mismatches AS (
          SELECT 
            cs.team_id,
            cs.liga_id,
            cs.saison_id,
            te.spiele as stored_spiele,
            cs.calculated_spiele,
            te.punkte as stored_punkte,
            cs.calculated_punkte,
            te.tore_fuer as stored_tore_fuer,
            cs.calculated_tore_fuer,
            te.tore_gegen as stored_tore_gegen,
            cs.calculated_tore_gegen
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
        )
        SELECT 
          COUNT(*) as mismatch_count,
          COUNT(DISTINCT liga_id) as affected_ligas,
          COUNT(DISTINCT saison_id) as affected_saisons,
          array_agg(team_id ORDER BY team_id LIMIT 10) as sample_teams
        FROM mismatches
      `);

      const mismatchCount = parseInt(accuracyCheck.rows[0].mismatch_count);
      
      if (mismatchCount === 0) {
        this.addCheck('Calculation Accuracy', 'Table vs Game Data', 'passed', 
          'All table entries match calculated values');
      } else {
        this.addCheck('Calculation Accuracy', 'Table vs Game Data', 'error', 
          `Found ${mismatchCount} mismatched entries`, mismatchCount, accuracyCheck.rows[0]);
      }

      // Check automation status
      const automationStatus = await this.client.query(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(CASE WHEN auto_calculated = true THEN 1 END) as auto_calculated,
          COUNT(CASE WHEN auto_calculated = false THEN 1 END) as manual_calculated,
          COUNT(CASE WHEN auto_calculated IS NULL THEN 1 END) as unknown_status
        FROM tabellen_eintraege
      `);

      this.addCheck('Calculation Accuracy', 'Automation Status', 'passed', 
        'Automation status tracked', 0, automationStatus.rows[0]);

    } catch (error) {
      this.addCheck('Calculation Accuracy', 'Accuracy Checks', 'error', 
        `Failed to check calculation accuracy: ${error.message}`);
    }
  }

  async generatePerformanceReport() {
    this.log('Generating performance report...');

    try {
      // Check query performance
      const slowQueries = await this.client.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements
        WHERE query LIKE '%tabellen_eintraege%' OR query LIKE '%spiele%'
        ORDER BY mean_time DESC
        LIMIT 10
      `).catch(() => ({ rows: [] })); // pg_stat_statements might not be enabled

      if (slowQueries.rows.length > 0) {
        const slowestQuery = slowQueries.rows[0];
        if (slowestQuery.mean_time > 1000) { // > 1 second
          this.addCheck('Performance', 'Query Performance', 'warning', 
            `Slowest query takes ${Math.round(slowestQuery.mean_time)}ms on average`, 
            slowQueries.rows.length, slowQueries.rows);
        } else {
          this.addCheck('Performance', 'Query Performance', 'passed', 
            `Query performance acceptable (fastest avg: ${Math.round(slowestQuery.mean_time)}ms)`);
        }
      } else {
        this.addCheck('Performance', 'Query Performance', 'warning', 
          'pg_stat_statements not available for performance analysis');
      }

      // Check table sizes
      const tableSizes = await this.client.query(`
        SELECT 
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN ('spiele', 'tabellen_eintraege', 'teams', 'ligas', 'saisons')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

      this.addCheck('Performance', 'Table Sizes', 'passed', 
        'Table size information collected', tableSizes.rows.length, tableSizes.rows);

      // Check index usage
      const unusedIndexes = await this.client.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
          AND idx_tup_read = 0
          AND idx_tup_fetch = 0
        ORDER BY tablename, indexname
      `);

      if (unusedIndexes.rows.length > 0) {
        this.addCheck('Performance', 'Index Usage', 'warning', 
          `Found ${unusedIndexes.rows.length} unused indexes`, 
          unusedIndexes.rows.length, unusedIndexes.rows);
      } else {
        this.addCheck('Performance', 'Index Usage', 'passed', 'All indexes are being used');
      }

    } catch (error) {
      this.addCheck('Performance', 'Performance Analysis', 'error', 
        `Failed to analyze performance: ${error.message}`);
    }
  }

  async generateAutomationReport() {
    this.log('Generating automation system report...');

    try {
      // Check automation tables exist
      const automationTables = ['queue_jobs', 'table_snapshots', 'automation_audit_logs'];
      for (const table of automationTables) {
        const exists = await this.client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          );
        `, [table]);

        if (exists.rows[0].exists) {
          this.addCheck('Automation System', `Table: ${table}`, 'passed', 'Table exists');
        } else {
          this.addCheck('Automation System', `Table: ${table}`, 'error', 'Table missing');
        }
      }

      // Check queue status
      const queueStats = await this.client.query(`
        SELECT 
          status,
          COUNT(*) as count,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM queue_jobs
        WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        GROUP BY status
      `).catch(() => ({ rows: [] }));

      if (queueStats.rows.length > 0) {
        this.addCheck('Automation System', 'Queue Activity', 'passed', 
          'Queue activity detected in last 24 hours', queueStats.rows.length, queueStats.rows);
      } else {
        this.addCheck('Automation System', 'Queue Activity', 'warning', 
          'No queue activity in last 24 hours');
      }

      // Check snapshot status
      const snapshotStats = await this.client.query(`
        SELECT 
          COUNT(*) as total_snapshots,
          COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as recent_snapshots,
          MIN(created_at) as oldest_snapshot,
          MAX(created_at) as newest_snapshot
        FROM table_snapshots
      `).catch(() => ({ rows: [{ total_snapshots: 0 }] }));

      const snapshots = snapshotStats.rows[0];
      if (parseInt(snapshots.total_snapshots) > 0) {
        this.addCheck('Automation System', 'Snapshots', 'passed', 
          `${snapshots.total_snapshots} snapshots available, ${snapshots.recent_snapshots} recent`, 
          parseInt(snapshots.total_snapshots), snapshots);
      } else {
        this.addCheck('Automation System', 'Snapshots', 'warning', 'No snapshots found');
      }

      // Check audit log
      const auditStats = await this.client.query(`
        SELECT 
          action,
          COUNT(*) as count,
          MAX(timestamp) as last_occurrence
        FROM automation_audit_logs
        WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
        GROUP BY action
        ORDER BY count DESC
      `).catch(() => ({ rows: [] }));

      if (auditStats.rows.length > 0) {
        this.addCheck('Automation System', 'Audit Logging', 'passed', 
          `${auditStats.rows.length} different actions logged in last 7 days`, 
          auditStats.rows.length, auditStats.rows);
      } else {
        this.addCheck('Automation System', 'Audit Logging', 'warning', 
          'No audit log entries in last 7 days');
      }

    } catch (error) {
      this.addCheck('Automation System', 'System Check', 'error', 
        `Failed to check automation system: ${error.message}`);
    }
  }

  async generateReport() {
    this.log('Starting comprehensive validation report generation...', 'info');

    await this.generateDatabaseOverview();
    await this.generateDataIntegrityReport();
    await this.generateCalculationAccuracyReport();
    await this.generatePerformanceReport();
    await this.generateAutomationReport();

    // Add summary
    this.reportData.summary.success = this.reportData.summary.errors === 0;
    this.reportData.summary.score = Math.round(
      (this.reportData.summary.passed / this.reportData.summary.totalChecks) * 100
    );

    this.printSummary();
    return this.reportData;
  }

  printSummary() {
    console.log('\n' + '='.repeat(70));
    console.log(chalk.cyan('VALIDATION REPORT SUMMARY'));
    console.log('='.repeat(70));

    console.log(chalk.blue(`Environment: ${this.reportData.environment}`));
    console.log(chalk.blue(`Generated: ${this.reportData.timestamp}`));
    console.log(chalk.blue(`Total Checks: ${this.reportData.summary.totalChecks}`));
    console.log(chalk.green(`✓ Passed: ${this.reportData.summary.passed}`));
    console.log(chalk.yellow(`⚠ Warnings: ${this.reportData.summary.warnings}`));
    console.log(chalk.red(`✗ Errors: ${this.reportData.summary.errors}`));
    console.log(chalk.blue(`Score: ${this.reportData.summary.score}%`));

    // Show section summaries
    console.log('\n' + chalk.cyan('SECTION SUMMARIES:'));
    for (const section of this.reportData.sections) {
      const sectionPassed = section.checks.filter(c => c.status === 'passed').length;
      const sectionWarnings = section.checks.filter(c => c.status === 'warning').length;
      const sectionErrors = section.checks.filter(c => c.status === 'error').length;
      
      console.log(`${section.name}: ${sectionPassed}✓ ${sectionWarnings}⚠ ${sectionErrors}✗`);
    }

    // Show critical issues
    const criticalIssues = [];
    for (const section of this.reportData.sections) {
      for (const check of section.checks) {
        if (check.status === 'error') {
          criticalIssues.push(`[${section.name}] ${check.name}: ${check.message}`);
        }
      }
    }

    if (criticalIssues.length > 0) {
      console.log('\n' + chalk.red('CRITICAL ISSUES:'));
      criticalIssues.forEach(issue => {
        console.log(chalk.red(`  ✗ ${issue}`));
      });
    }

    console.log('\n' + (this.reportData.summary.errors === 0 ? 
      chalk.green('🎉 VALIDATION PASSED') : 
      chalk.red('❌ VALIDATION FAILED')
    ));
  }

  async saveReport() {
    const reportPath = path.join(__dirname, '..', 'logs', `validation-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2));

    // Also save HTML report
    const htmlReport = this.generateHTMLReport();
    const htmlPath = path.join(__dirname, '..', 'logs', `validation-report-${Date.now()}.html`);
    fs.writeFileSync(htmlPath, htmlReport);

    this.log(`Reports saved to: ${reportPath} and ${htmlPath}`, 'info');
    return { json: reportPath, html: htmlPath };
  }

  generateHTMLReport() {
    const statusColors = {
      passed: '#28a745',
      warning: '#ffc107',
      error: '#dc3545'
    };

    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Data Validation Report - ${this.reportData.environment}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .summary-card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        .check { margin: 10px 0; padding: 10px; border-left: 4px solid #ddd; background: #f8f9fa; }
        .check.passed { border-left-color: ${statusColors.passed}; }
        .check.warning { border-left-color: ${statusColors.warning}; }
        .check.error { border-left-color: ${statusColors.error}; }
        .check-name { font-weight: bold; }
        .check-message { margin: 5px 0; }
        .check-details { background: #e9ecef; padding: 10px; margin-top: 10px; border-radius: 3px; font-family: monospace; font-size: 12px; }
        .score { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Data Validation Report</h1>
        <p><strong>Environment:</strong> ${this.reportData.environment}</p>
        <p><strong>Generated:</strong> ${this.reportData.timestamp}</p>
    </div>

    <div class="summary">
        <div class="summary-card">
            <h3>Overall Score</h3>
            <div class="score" style="color: ${this.reportData.summary.score >= 80 ? statusColors.passed : this.reportData.summary.score >= 60 ? statusColors.warning : statusColors.error}">
                ${this.reportData.summary.score}%
            </div>
        </div>
        <div class="summary-card">
            <h3>Total Checks</h3>
            <div class="score">${this.reportData.summary.totalChecks}</div>
        </div>
        <div class="summary-card">
            <h3>Results</h3>
            <div style="color: ${statusColors.passed}">✓ ${this.reportData.summary.passed} Passed</div>
            <div style="color: ${statusColors.warning}">⚠ ${this.reportData.summary.warnings} Warnings</div>
            <div style="color: ${statusColors.error}">✗ ${this.reportData.summary.errors} Errors</div>
        </div>
    </div>
`;

    for (const section of this.reportData.sections) {
      html += `
    <div class="section">
        <h2>${section.name}</h2>
`;
      
      for (const check of section.checks) {
        html += `
        <div class="check ${check.status}">
            <div class="check-name">${check.name}</div>
            <div class="check-message">${check.message}</div>
            ${check.count > 0 ? `<div><strong>Count:</strong> ${check.count}</div>` : ''}
            ${check.details ? `<div class="check-details">${JSON.stringify(check.details, null, 2)}</div>` : ''}
        </div>
`;
      }
      
      html += `
    </div>
`;
    }

    html += `
</body>
</html>
`;

    return html;
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

  const generator = new ValidationReportGenerator(config);

  try {
    await generator.connect();
    const report = await generator.generateReport();
    const paths = await generator.saveReport();

    console.log(chalk.blue(`\nReports saved to:`));
    console.log(chalk.blue(`JSON: ${paths.json}`));
    console.log(chalk.blue(`HTML: ${paths.html}`));

    process.exit(report.summary.errors === 0 ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('Report generation failed:'), error.message);
    process.exit(1);
  } finally {
    await generator.disconnect();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Unhandled error:'), error);
    process.exit(1);
  });
}

module.exports = ValidationReportGenerator;