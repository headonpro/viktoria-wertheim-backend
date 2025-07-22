#!/usr/bin/env node

/**
 * Database Enum Repair Script
 * 
 * This script fixes invalid enum values in existing mannschaft records
 * with rollback capability and detailed logging.
 * 
 * Requirements: 3.1, 3.2, 5.1
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables
require('dotenv').config();

// Valid enum values from schema
const VALID_ENUMS = {
  status: ['aktiv', 'inaktiv', 'aufgeloest'],
  liga: ['Kreisklasse B', 'Kreisklasse A', 'Kreisliga', 'Landesliga'],
  altersklasse: ['senioren', 'a-jugend', 'b-jugend', 'c-jugend', 'd-jugend', 'e-jugend', 'f-jugend', 'bambini'],
  trend: ['steigend', 'gleich', 'fallend']
};

// Default values for NULL enum fields
const DEFAULT_VALUES = {
  status: 'aktiv',
  liga: 'Kreisklasse B',
  altersklasse: 'senioren',
  trend: 'gleich'
};

// Common invalid value mappings
const VALUE_MAPPINGS = {
  status: {
    'active': 'aktiv',
    'inactive': 'inaktiv',
    'dissolved': 'aufgeloest',
    'null': 'aktiv',
    '': 'aktiv'
  },
  liga: {
    'Kreisklasse_B': 'Kreisklasse B',
    'Kreisklasse_A': 'Kreisklasse A',
    'null': 'Kreisklasse B',
    '': 'Kreisklasse B'
  },
  altersklasse: {
    'senior': 'senioren',
    'seniors': 'senioren',
    'a_jugend': 'a-jugend',
    'b_jugend': 'b-jugend',
    'c_jugend': 'c-jugend',
    'd_jugend': 'd-jugend',
    'e_jugend': 'e-jugend',
    'f_jugend': 'f-jugend',
    'null': 'senioren',
    '': 'senioren'
  },
  trend: {
    'up': 'steigend',
    'rising': 'steigend',
    'down': 'fallend',
    'falling': 'fallend',
    'stable': 'gleich',
    'same': 'gleich',
    'null': 'gleich',
    '': 'gleich'
  }
};

// Database connection configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'viktoria_wertheim',
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres123',
};

class DatabaseEnumRepairer {
  constructor() {
    this.client = new Client(dbConfig);
    this.repairResults = {
      totalRecords: 0,
      repairedRecords: 0,
      skippedRecords: 0,
      failedRecords: 0,
      repairs: [],
      rollbackData: [],
      timestamp: new Date().toISOString(),
      dryRun: false
    };
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
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
    this.rl.close();
    console.log('🔌 Disconnected from database');
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim().toLowerCase());
      });
    });
  }

  async confirmRepair() {
    console.log('\n⚠️  WARNING: This script will modify database records!');
    console.log('📋 Recommended steps:');
    console.log('   1. Create a database backup first');
    console.log('   2. Run in dry-run mode to preview changes');
    console.log('   3. Review the changes carefully');
    console.log('   4. Execute the actual repair');
    
    const answer = await this.askQuestion('\n❓ Do you want to proceed? (yes/no): ');
    
    if (answer !== 'yes' && answer !== 'y') {
      console.log('❌ Repair cancelled by user');
      return false;
    }

    const dryRunAnswer = await this.askQuestion('❓ Run in dry-run mode first? (recommended - yes/no): ');
    this.repairResults.dryRun = (dryRunAnswer === 'yes' || dryRunAnswer === 'y');

    return true;
  }

  async scanInvalidRecords() {
    console.log('\n🔍 Scanning for records that need repair...\n');

    try {
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
        WHERE 
          status IS NULL OR status NOT IN ('aktiv', 'inaktiv', 'aufgeloest') OR
          liga IS NULL OR liga NOT IN ('Kreisklasse B', 'Kreisklasse A', 'Kreisliga', 'Landesliga') OR
          altersklasse IS NULL OR altersklasse NOT IN ('senioren', 'a-jugend', 'b-jugend', 'c-jugend', 'd-jugend', 'e-jugend', 'f-jugend', 'bambini') OR
          trend IS NULL OR trend NOT IN ('steigend', 'gleich', 'fallend')
        ORDER BY id;
      `;

      const result = await this.client.query(query);
      const invalidRecords = result.rows;

      this.repairResults.totalRecords = invalidRecords.length;
      console.log(`📊 Found ${invalidRecords.length} records that need repair`);

      if (invalidRecords.length === 0) {
        console.log('✅ No records need repair!');
        return [];
      }

      return invalidRecords;

    } catch (error) {
      console.error('❌ Error scanning invalid records:', error.message);
      throw error;
    }
  }

  generateRepairPlan(record) {
    const repairs = [];
    const rollbackData = {
      id: record.id,
      name: record.name,
      originalValues: {},
      newValues: {}
    };

    // Check and plan status repair
    if (!record.status || !VALID_ENUMS.status.includes(record.status)) {
      const originalValue = record.status;
      const newValue = this.mapValue('status', originalValue) || DEFAULT_VALUES.status;
      
      repairs.push({
        field: 'status',
        originalValue,
        newValue,
        reason: originalValue === null ? 'NULL_VALUE' : 'INVALID_VALUE'
      });
      
      rollbackData.originalValues.status = originalValue;
      rollbackData.newValues.status = newValue;
    }

    // Check and plan liga repair
    if (!record.liga || !VALID_ENUMS.liga.includes(record.liga)) {
      const originalValue = record.liga;
      const newValue = this.mapValue('liga', originalValue) || DEFAULT_VALUES.liga;
      
      repairs.push({
        field: 'liga',
        originalValue,
        newValue,
        reason: originalValue === null ? 'NULL_VALUE' : 'INVALID_VALUE'
      });
      
      rollbackData.originalValues.liga = originalValue;
      rollbackData.newValues.liga = newValue;
    }

    // Check and plan altersklasse repair
    if (!record.altersklasse || !VALID_ENUMS.altersklasse.includes(record.altersklasse)) {
      const originalValue = record.altersklasse;
      const newValue = this.mapValue('altersklasse', originalValue) || DEFAULT_VALUES.altersklasse;
      
      repairs.push({
        field: 'altersklasse',
        originalValue,
        newValue,
        reason: originalValue === null ? 'NULL_VALUE' : 'INVALID_VALUE'
      });
      
      rollbackData.originalValues.altersklasse = originalValue;
      rollbackData.newValues.altersklasse = newValue;
    }

    // Check and plan trend repair
    if (!record.trend || !VALID_ENUMS.trend.includes(record.trend)) {
      const originalValue = record.trend;
      const newValue = this.mapValue('trend', originalValue) || DEFAULT_VALUES.trend;
      
      repairs.push({
        field: 'trend',
        originalValue,
        newValue,
        reason: originalValue === null ? 'NULL_VALUE' : 'INVALID_VALUE'
      });
      
      rollbackData.originalValues.trend = originalValue;
      rollbackData.newValues.trend = newValue;
    }

    return { repairs, rollbackData };
  }

  mapValue(field, value) {
    if (!value) return null;
    
    const stringValue = String(value).toLowerCase();
    return VALUE_MAPPINGS[field][stringValue] || null;
  }

  async repairRecord(record, repairPlan) {
    if (repairPlan.repairs.length === 0) {
      this.repairResults.skippedRecords++;
      return { success: true, message: 'No repairs needed' };
    }

    try {
      // Build UPDATE query
      const setClause = repairPlan.repairs.map(repair => 
        `${repair.field} = $${repairPlan.repairs.indexOf(repair) + 2}`
      ).join(', ');
      
      const values = [record.id, ...repairPlan.repairs.map(repair => repair.newValue)];
      
      const query = `
        UPDATE mannschaften 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, status, liga, altersklasse, trend;
      `;

      if (this.repairResults.dryRun) {
        console.log(`🔍 DRY RUN - Would execute: ${query}`);
        console.log(`🔍 DRY RUN - With values: [${values.join(', ')}]`);
        
        this.repairResults.repairedRecords++;
        return { success: true, message: 'Dry run - no actual changes made' };
      }

      const result = await this.client.query(query, values);
      
      if (result.rows.length > 0) {
        this.repairResults.repairedRecords++;
        this.repairResults.rollbackData.push(repairPlan.rollbackData);
        
        return { 
          success: true, 
          message: 'Record repaired successfully',
          updatedRecord: result.rows[0]
        };
      } else {
        throw new Error('No rows updated');
      }

    } catch (error) {
      this.repairResults.failedRecords++;
      return { 
        success: false, 
        message: `Failed to repair record: ${error.message}` 
      };
    }
  }

  async executeRepairs() {
    const invalidRecords = await this.scanInvalidRecords();
    
    if (invalidRecords.length === 0) {
      return this.repairResults;
    }

    console.log(`\n🔧 ${this.repairResults.dryRun ? 'DRY RUN - ' : ''}Starting repair process...\n`);

    for (const record of invalidRecords) {
      const repairPlan = this.generateRepairPlan(record);
      
      if (repairPlan.repairs.length > 0) {
        console.log(`🔧 ${this.repairResults.dryRun ? 'DRY RUN - ' : ''}Repairing Record ID ${record.id} (${record.name}):`);
        
        repairPlan.repairs.forEach(repair => {
          const reasonIcon = repair.reason === 'NULL_VALUE' ? '🔴' : '🟡';
          console.log(`   ${reasonIcon} ${repair.field}: "${repair.originalValue}" → "${repair.newValue}"`);
        });

        const result = await this.repairRecord(record, repairPlan);
        
        if (result.success) {
          console.log(`   ✅ ${result.message}`);
          
          this.repairResults.repairs.push({
            recordId: record.id,
            recordName: record.name,
            repairs: repairPlan.repairs,
            result: result.message
          });
        } else {
          console.log(`   ❌ ${result.message}`);
        }
      } else {
        console.log(`✅ Record ID ${record.id} (${record.name}) - No repairs needed`);
        this.repairResults.skippedRecords++;
      }
    }

    return this.repairResults;
  }

  async generateRollbackScript() {
    if (this.repairResults.rollbackData.length === 0) {
      console.log('ℹ️  No rollback data to generate');
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rollbackDir = path.join(__dirname, '..', 'validation-reports');
    const rollbackFile = path.join(rollbackDir, `rollback-script-${timestamp}.sql`);

    let rollbackSQL = `-- Rollback Script Generated: ${new Date().toISOString()}\n`;
    rollbackSQL += `-- This script will revert the enum repairs made by the repair script\n\n`;

    this.repairResults.rollbackData.forEach(rollback => {
      rollbackSQL += `-- Rollback for Record ID ${rollback.id} (${rollback.name})\n`;
      
      const setClause = Object.entries(rollback.originalValues)
        .map(([field, value]) => `${field} = ${value === null ? 'NULL' : `'${value}'`}`)
        .join(', ');
      
      rollbackSQL += `UPDATE mannschaften SET ${setClause} WHERE id = ${rollback.id};\n\n`;
    });

    fs.writeFileSync(rollbackFile, rollbackSQL);
    console.log(`📄 Rollback script generated: ${rollbackFile}`);
    
    return rollbackFile;
  }

  async generateReport() {
    const reportDir = path.join(__dirname, '..', 'validation-reports');
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportDir, `enum-repair-report-${timestamp}.json`);
    const summaryFile = path.join(reportDir, `enum-repair-summary-${timestamp}.md`);

    // Write detailed JSON report
    fs.writeFileSync(reportFile, JSON.stringify(this.repairResults, null, 2));

    // Write human-readable summary
    const summaryContent = this.generateMarkdownSummary();
    fs.writeFileSync(summaryFile, summaryContent);

    console.log(`\n📄 Reports generated:`);
    console.log(`   📋 Detailed report: ${reportFile}`);
    console.log(`   📝 Summary report: ${summaryFile}`);

    return { reportFile, summaryFile };
  }

  generateMarkdownSummary() {
    const { totalRecords, repairedRecords, skippedRecords, failedRecords, timestamp, dryRun } = this.repairResults;

    return `# Database Enum Repair Report

**Generated:** ${timestamp}
**Mode:** ${dryRun ? 'DRY RUN' : 'LIVE REPAIR'}

## Summary

- **Total Records Processed:** ${totalRecords}
- **Records Repaired:** ${repairedRecords}
- **Records Skipped:** ${skippedRecords}
- **Failed Repairs:** ${failedRecords}
- **Success Rate:** ${totalRecords > 0 ? ((repairedRecords / totalRecords) * 100).toFixed(2) : 0}%

## Repair Details

${this.repairResults.repairs.length > 0 ? `
### Successfully Repaired Records

${this.repairResults.repairs.map(repair => `
#### Record ID ${repair.recordId} (${repair.recordName})

${repair.repairs.map(r => `- **${r.field}:** "${r.originalValue}" → "${r.newValue}" (${r.reason})`).join('\n')}
`).join('')}
` : '### No repairs were needed or performed'}

## Field Repair Statistics

${this.generateFieldStatistics()}

## Recommendations

${dryRun ? `
### Next Steps (After Dry Run)

1. **Review the proposed changes** above carefully
2. **Create a database backup** before proceeding
3. **Run the script again without dry-run mode** to apply changes
4. **Verify the repairs** using the validation scanner
5. **Keep the rollback script** for emergency recovery
` : `
### Post-Repair Actions

1. **Verify repairs** by running the validation scanner again
2. **Test admin interface** to ensure validation errors are resolved
3. **Keep rollback script** available for emergency recovery
4. **Implement preventive measures** to avoid future data issues
5. **Update validation rules** in admin interface if needed
`}

## Technical Details

- **Database:** ${dbConfig.database}
- **Host:** ${dbConfig.host}:${dbConfig.port}
- **Timestamp:** ${timestamp}
- **Rollback Available:** ${this.repairResults.rollbackData.length > 0 ? 'Yes' : 'No'}

---
*Report generated by Database Enum Repair Script*
`;
  }

  generateFieldStatistics() {
    const fieldStats = {};
    
    this.repairResults.repairs.forEach(repair => {
      repair.repairs.forEach(r => {
        if (!fieldStats[r.field]) {
          fieldStats[r.field] = { total: 0, nullValues: 0, invalidValues: 0 };
        }
        fieldStats[r.field].total++;
        if (r.reason === 'NULL_VALUE') {
          fieldStats[r.field].nullValues++;
        } else {
          fieldStats[r.field].invalidValues++;
        }
      });
    });

    if (Object.keys(fieldStats).length === 0) {
      return 'No field-specific statistics available.';
    }

    return Object.entries(fieldStats).map(([field, stats]) => `
### ${field}
- **Total Repairs:** ${stats.total}
- **NULL Values Fixed:** ${stats.nullValues}
- **Invalid Values Fixed:** ${stats.invalidValues}
`).join('');
  }

  async printConsoleSummary() {
    const { totalRecords, repairedRecords, skippedRecords, failedRecords, dryRun } = this.repairResults;

    console.log('\n' + '='.repeat(60));
    console.log(`📊 DATABASE ENUM REPAIR SUMMARY ${dryRun ? '(DRY RUN)' : ''}`);
    console.log('='.repeat(60));
    
    console.log(`\n📈 Repair Statistics:`);
    console.log(`   Total Records: ${totalRecords}`);
    console.log(`   Repaired: ${repairedRecords}`);
    console.log(`   Skipped: ${skippedRecords}`);
    console.log(`   Failed: ${failedRecords}`);
    
    if (totalRecords > 0) {
      const successRate = ((repairedRecords / totalRecords) * 100).toFixed(2);
      console.log(`   Success Rate: ${successRate}%`);
    }

    if (dryRun) {
      console.log(`\n🔍 This was a DRY RUN - no actual changes were made`);
      console.log(`📋 To apply these changes, run the script again without dry-run mode`);
    } else if (repairedRecords > 0) {
      console.log(`\n✅ Repairs completed successfully!`);
      console.log(`📄 Rollback script generated for emergency recovery`);
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Main execution function
async function main() {
  const repairer = new DatabaseEnumRepairer();

  try {
    console.log('🚀 Starting Database Enum Repair Script...');
    
    await repairer.connect();
    
    const confirmed = await repairer.confirmRepair();
    if (!confirmed) {
      return;
    }
    
    await repairer.executeRepairs();
    await repairer.generateReport();
    
    if (!repairer.repairResults.dryRun) {
      await repairer.generateRollbackScript();
    }
    
    await repairer.printConsoleSummary();
    
  } catch (error) {
    console.error('💥 Repair process failed:', error.message);
    process.exit(1);
  } finally {
    await repairer.disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DatabaseEnumRepairer, VALID_ENUMS, DEFAULT_VALUES, VALUE_MAPPINGS };