#!/usr/bin/env node

/**
 * Database Enum Validation Scanner
 * 
 * This script scans all mannschaft records for invalid enum values
 * and generates a detailed report of data integrity problems.
 * 
 * Requirements: 2.3, 3.1, 3.2
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Valid enum values from schema
const VALID_ENUMS = {
  status: ['aktiv', 'inaktiv', 'aufgeloest'],
  liga: ['Kreisklasse B', 'Kreisklasse A', 'Kreisliga', 'Landesliga'],
  altersklasse: ['senioren', 'a-jugend', 'b-jugend', 'c-jugend', 'd-jugend', 'e-jugend', 'f-jugend', 'bambini'],
  trend: ['steigend', 'gleich', 'fallend']
};

// Database connection configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'viktoria_wertheim',
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres123',
};

class DatabaseEnumValidator {
  constructor() {
    this.client = new Client(dbConfig);
    this.validationResults = {
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      issues: [],
      summary: {},
      timestamp: new Date().toISOString()
    };
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('✅ Connected to PostgreSQL database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await this.client.end();
    console.log('🔌 Disconnected from database');
  }

  async scanMannschaftRecords() {
    console.log('\n🔍 Scanning mannschaft records for enum validation issues...\n');

    try {
      // Query all mannschaft records
      const query = `
        SELECT 
          id,
          name,
          status,
          liga,
          altersklasse,
          trend,
          created_at,
          updated_at
        FROM mannschaften 
        ORDER BY id;
      `;

      const result = await this.client.query(query);
      const records = result.rows;

      this.validationResults.totalRecords = records.length;
      console.log(`📊 Found ${records.length} mannschaft records to validate`);

      if (records.length === 0) {
        console.log('ℹ️  No mannschaft records found in database');
        return this.validationResults;
      }

      // Validate each record
      for (const record of records) {
        await this.validateRecord(record);
      }

      // Generate summary
      this.generateSummary();
      
      return this.validationResults;

    } catch (error) {
      console.error('❌ Error scanning mannschaft records:', error.message);
      throw error;
    }
  }

  async validateRecord(record) {
    const recordIssues = [];
    let hasIssues = false;

    // Validate status enum
    if (record.status && !VALID_ENUMS.status.includes(record.status)) {
      recordIssues.push({
        field: 'status',
        currentValue: record.status,
        validValues: VALID_ENUMS.status,
        severity: 'HIGH'
      });
      hasIssues = true;
    } else if (!record.status) {
      recordIssues.push({
        field: 'status',
        currentValue: null,
        validValues: VALID_ENUMS.status,
        severity: 'HIGH',
        issue: 'NULL_VALUE'
      });
      hasIssues = true;
    }

    // Validate liga enum
    if (record.liga && !VALID_ENUMS.liga.includes(record.liga)) {
      recordIssues.push({
        field: 'liga',
        currentValue: record.liga,
        validValues: VALID_ENUMS.liga,
        severity: 'HIGH'
      });
      hasIssues = true;
    } else if (!record.liga) {
      recordIssues.push({
        field: 'liga',
        currentValue: null,
        validValues: VALID_ENUMS.liga,
        severity: 'HIGH',
        issue: 'NULL_VALUE'
      });
      hasIssues = true;
    }

    // Validate altersklasse enum
    if (record.altersklasse && !VALID_ENUMS.altersklasse.includes(record.altersklasse)) {
      recordIssues.push({
        field: 'altersklasse',
        currentValue: record.altersklasse,
        validValues: VALID_ENUMS.altersklasse,
        severity: 'HIGH'
      });
      hasIssues = true;
    } else if (!record.altersklasse) {
      recordIssues.push({
        field: 'altersklasse',
        currentValue: null,
        validValues: VALID_ENUMS.altersklasse,
        severity: 'HIGH',
        issue: 'NULL_VALUE'
      });
      hasIssues = true;
    }

    // Validate trend enum
    if (record.trend && !VALID_ENUMS.trend.includes(record.trend)) {
      recordIssues.push({
        field: 'trend',
        currentValue: record.trend,
        validValues: VALID_ENUMS.trend,
        severity: 'MEDIUM'
      });
      hasIssues = true;
    } else if (!record.trend) {
      recordIssues.push({
        field: 'trend',
        currentValue: null,
        validValues: VALID_ENUMS.trend,
        severity: 'MEDIUM',
        issue: 'NULL_VALUE'
      });
      hasIssues = true;
    }

    // Record results
    if (hasIssues) {
      this.validationResults.invalidRecords++;
      this.validationResults.issues.push({
        recordId: record.id,
        recordName: record.name,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        issues: recordIssues
      });

      // Log issues for immediate feedback
      console.log(`❌ Record ID ${record.id} (${record.name}):`);
      recordIssues.forEach(issue => {
        const severity = issue.severity === 'HIGH' ? '🔴' : '🟡';
        const issueType = issue.issue === 'NULL_VALUE' ? ' (NULL)' : '';
        console.log(`   ${severity} ${issue.field}: "${issue.currentValue}"${issueType} - Expected: [${issue.validValues.join(', ')}]`);
      });
    } else {
      this.validationResults.validRecords++;
      console.log(`✅ Record ID ${record.id} (${record.name}) - All enums valid`);
    }
  }

  generateSummary() {
    // Count issues by field and severity
    const fieldIssues = {};
    const severityCount = { HIGH: 0, MEDIUM: 0 };

    this.validationResults.issues.forEach(record => {
      record.issues.forEach(issue => {
        // Count by field
        if (!fieldIssues[issue.field]) {
          fieldIssues[issue.field] = {
            total: 0,
            invalidValues: new Set(),
            nullValues: 0
          };
        }
        fieldIssues[issue.field].total++;
        
        if (issue.issue === 'NULL_VALUE') {
          fieldIssues[issue.field].nullValues++;
        } else {
          fieldIssues[issue.field].invalidValues.add(issue.currentValue);
        }

        // Count by severity
        severityCount[issue.severity]++;
      });
    });

    // Convert Sets to Arrays for JSON serialization
    Object.keys(fieldIssues).forEach(field => {
      fieldIssues[field].invalidValues = Array.from(fieldIssues[field].invalidValues);
    });

    this.validationResults.summary = {
      validationRate: ((this.validationResults.validRecords / this.validationResults.totalRecords) * 100).toFixed(2),
      fieldIssues,
      severityCount,
      mostProblematicFields: Object.entries(fieldIssues)
        .sort(([,a], [,b]) => b.total - a.total)
        .slice(0, 3)
        .map(([field, data]) => ({ field, issueCount: data.total }))
    };
  }

  async generateReport() {
    const reportDir = path.join(__dirname, '..', 'validation-reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportDir, `enum-validation-report-${timestamp}.json`);
    const summaryFile = path.join(reportDir, `enum-validation-summary-${timestamp}.md`);

    // Write detailed JSON report
    fs.writeFileSync(reportFile, JSON.stringify(this.validationResults, null, 2));

    // Write human-readable summary
    const summaryContent = this.generateMarkdownSummary();
    fs.writeFileSync(summaryFile, summaryContent);

    console.log(`\n📄 Reports generated:`);
    console.log(`   📋 Detailed report: ${reportFile}`);
    console.log(`   📝 Summary report: ${summaryFile}`);

    return { reportFile, summaryFile };
  }

  generateMarkdownSummary() {
    const { summary, totalRecords, validRecords, invalidRecords, timestamp } = this.validationResults;

    return `# Database Enum Validation Report

**Generated:** ${timestamp}

## Summary

- **Total Records:** ${totalRecords}
- **Valid Records:** ${validRecords}
- **Invalid Records:** ${invalidRecords}
- **Validation Rate:** ${summary.validationRate}%

## Issues by Severity

- **🔴 High Priority:** ${summary.severityCount.HIGH} issues
- **🟡 Medium Priority:** ${summary.severityCount.MEDIUM} issues

## Field-Specific Issues

${Object.entries(summary.fieldIssues).map(([field, data]) => `
### ${field}
- **Total Issues:** ${data.total}
- **NULL Values:** ${data.nullValues}
- **Invalid Values Found:** ${data.invalidValues.length > 0 ? data.invalidValues.join(', ') : 'None'}
- **Valid Options:** ${VALID_ENUMS[field].join(', ')}
`).join('')}

## Most Problematic Fields

${summary.mostProblematicFields.map((field, index) => 
  `${index + 1}. **${field.field}** - ${field.issueCount} issues`
).join('\n')}

## Recommendations

${invalidRecords > 0 ? `
### Immediate Actions Required

1. **Fix High Priority Issues:** Address all status, liga, and altersklasse validation errors
2. **Handle NULL Values:** Ensure all required enum fields have valid values
3. **Data Cleanup:** Run the automated data repair script to fix common invalid values

### Data Repair Strategy

- Use the automated repair script to fix common invalid enum values
- Manually review and fix any unique invalid values
- Implement validation checks to prevent future data integrity issues
` : `
### All Clear! ✅

All mannschaft records have valid enum values. No immediate action required.

### Preventive Measures

- Continue monitoring enum validation with regular scans
- Implement validation checks in admin interface
- Add automated tests for enum validation
`}

## Next Steps

1. Review detailed JSON report for specific record issues
2. Run the automated data repair script if needed
3. Implement preventive validation measures
4. Schedule regular validation scans

---
*Report generated by Database Enum Validation Scanner*
`;
  }

  async printConsoleSummary() {
    const { summary, totalRecords, validRecords, invalidRecords } = this.validationResults;

    console.log('\n' + '='.repeat(60));
    console.log('📊 DATABASE ENUM VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total Records: ${totalRecords}`);
    console.log(`   Valid Records: ${validRecords} (${summary.validationRate}%)`);
    console.log(`   Invalid Records: ${invalidRecords}`);

    if (invalidRecords > 0) {
      console.log(`\n🚨 Issues Found:`);
      console.log(`   High Priority: ${summary.severityCount.HIGH}`);
      console.log(`   Medium Priority: ${summary.severityCount.MEDIUM}`);

      console.log(`\n🎯 Most Problematic Fields:`);
      summary.mostProblematicFields.forEach((field, index) => {
        console.log(`   ${index + 1}. ${field.field}: ${field.issueCount} issues`);
      });

      console.log(`\n⚠️  Action Required: Run the data repair script to fix invalid enum values`);
    } else {
      console.log(`\n✅ All records have valid enum values!`);
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Main execution function
async function main() {
  const validator = new DatabaseEnumValidator();

  try {
    console.log('🚀 Starting Database Enum Validation Scanner...');
    
    await validator.connect();
    await validator.scanMannschaftRecords();
    await validator.generateReport();
    await validator.printConsoleSummary();
    
  } catch (error) {
    console.error('💥 Validation scan failed:', error.message);
    process.exit(1);
  } finally {
    await validator.disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DatabaseEnumValidator, VALID_ENUMS };