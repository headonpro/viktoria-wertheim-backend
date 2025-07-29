/**
 * Migration script for converting team-based spiele to club-based
 * Requirements: 8.1, 8.3
 * 
 * Usage:
 * node scripts/migrate-spiele-to-clubs.js [options]
 * 
 * Options:
 * --dry-run    : Run validation only, don't perform migration
 * --rollback   : Rollback using backup ID (requires --backup-id)
 * --backup-id  : Backup ID for rollback
 * --force      : Skip confirmation prompts
 */

const { createStrapi } = require('@strapi/strapi');
const { createSpielMigrationService } = require('../src/api/spiel/services/migration');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  rollback: args.includes('--rollback'),
  force: args.includes('--force'),
  backupId: args.includes('--backup-id') ? args[args.indexOf('--backup-id') + 1] : null
};

async function runMigration() {
  let strapi;
  
  try {
    console.log('🚀 Starting Spiel Migration Tool...\n');
    
    // Initialize Strapi
    strapi = await createStrapi();
    const migrationService = createSpielMigrationService(strapi);
    
    if (options.rollback) {
      await handleRollback(migrationService);
    } else if (options.dryRun) {
      await handleDryRun(migrationService);
    } else {
      await handleMigration(migrationService);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (strapi) {
      await strapi.destroy();
    }
  }
}

async function handleDryRun(migrationService) {
  console.log('🔍 Running validation (dry-run mode)...\n');
  
  const validation = await migrationService.validateMigrationData();
  
  console.log('=== VALIDATION RESULTS ===');
  console.log(`✅ Valid: ${validation.isValid ? 'Yes' : 'No'}`);
  console.log(`📊 Total Spiele: ${validation.totalSpiele}`);
  console.log(`🏠 Team-based: ${validation.teamBasedSpiele}`);
  console.log(`🏛️  Club-based: ${validation.clubBasedSpiele}`);
  console.log(`🔄 Mixed: ${validation.mixedSpiele}`);
  console.log(`❓ Unmappable: ${validation.unmappableSpiele}`);
  console.log(`⚠️  Inconsistencies: ${validation.inconsistencies.length}`);
  
  if (validation.inconsistencies.length > 0) {
    console.log('\n=== INCONSISTENCIES ===');
    validation.inconsistencies.forEach((issue, index) => {
      console.log(`${index + 1}. Spiel ID ${issue.spielId}: ${issue.issue}`);
      console.log(`   Current: ${JSON.stringify(issue.currentData)}`);
      console.log(`   Expected: ${JSON.stringify(issue.expectedData)}`);
      console.log(`   Auto-fixable: ${issue.canAutoFix ? 'Yes' : 'No'}`);
    });
  }
  
  if (validation.recommendations.length > 0) {
    console.log('\n=== RECOMMENDATIONS ===');
    validation.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  const migrationProgress = validation.totalSpiele > 0 
    ? ((validation.clubBasedSpiele + validation.mixedSpiele) / validation.totalSpiele) * 100 
    : 0;
  
  console.log(`\n📈 Migration Progress: ${migrationProgress.toFixed(1)}%`);
  
  if (validation.teamBasedSpiele > 0) {
    console.log(`\n💡 Run without --dry-run to migrate ${validation.teamBasedSpiele} team-based spiele to clubs`);
  } else {
    console.log('\n✅ All spiele are already using club relations or are mixed!');
  }
}

async function handleMigration(migrationService) {
  console.log('🔄 Starting team-to-club migration...\n');
  
  // First run validation
  const validation = await migrationService.validateMigrationData();
  
  console.log('=== PRE-MIGRATION STATUS ===');
  console.log(`📊 Total Spiele: ${validation.totalSpiele}`);
  console.log(`🏠 Team-based (to migrate): ${validation.teamBasedSpiele}`);
  console.log(`🏛️  Club-based (already done): ${validation.clubBasedSpiele}`);
  console.log(`🔄 Mixed: ${validation.mixedSpiele}`);
  
  if (validation.teamBasedSpiele === 0) {
    console.log('\n✅ No spiele need migration. All are already using club relations!');
    return;
  }
  
  if (validation.inconsistencies.length > 0) {
    console.log(`\n⚠️  Found ${validation.inconsistencies.length} inconsistencies:`);
    validation.inconsistencies.slice(0, 5).forEach((issue, index) => {
      console.log(`  ${index + 1}. Spiel ${issue.spielId}: ${issue.issue}`);
    });
    if (validation.inconsistencies.length > 5) {
      console.log(`  ... and ${validation.inconsistencies.length - 5} more`);
    }
  }
  
  // Confirmation prompt
  if (!options.force) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`\n❓ Proceed with migration of ${validation.teamBasedSpiele} spiele? (y/N): `, resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Migration cancelled by user');
      return;
    }
  }
  
  // Run migration
  console.log('\n🚀 Starting migration...');
  const result = await migrationService.migrateTeamToClubRelations();
  
  console.log('\n=== MIGRATION RESULTS ===');
  console.log(`✅ Success: ${result.success ? 'Yes' : 'No'}`);
  console.log(`📊 Processed: ${result.processed}`);
  console.log(`✅ Migrated: ${result.migrated}`);
  console.log(`⏭️  Skipped: ${result.skipped}`);
  console.log(`❌ Errors: ${result.errors.length}`);
  console.log(`⚠️  Warnings: ${result.warnings.length}`);
  console.log(`⏱️  Duration: ${result.duration}ms`);
  
  if (result.backupId) {
    console.log(`💾 Backup ID: ${result.backupId}`);
    console.log(`   Use --rollback --backup-id ${result.backupId} to rollback if needed`);
  }
  
  if (result.errors.length > 0) {
    console.log('\n=== ERRORS ===');
    result.errors.forEach((error, index) => {
      console.log(`${index + 1}. Spiel ${error.spielId}: ${error.error} (${error.severity})`);
    });
  }
  
  if (result.warnings.length > 0) {
    console.log('\n=== WARNINGS ===');
    result.warnings.slice(0, 10).forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
    if (result.warnings.length > 10) {
      console.log(`... and ${result.warnings.length - 10} more warnings`);
    }
  }
  
  if (result.success && result.migrated > 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('💡 Run with --dry-run to validate the results');
  } else if (!result.success) {
    console.log('\n❌ Migration completed with errors. Check the logs above.');
  }
}

async function handleRollback(migrationService) {
  if (!options.backupId) {
    console.error('❌ Rollback requires --backup-id parameter');
    process.exit(1);
  }
  
  console.log(`🔄 Starting rollback using backup: ${options.backupId}\n`);
  
  // Confirmation prompt
  if (!options.force) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`❓ Are you sure you want to rollback using backup ${options.backupId}? This will restore team relations and remove club relations. (y/N): `, resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Rollback cancelled by user');
      return;
    }
  }
  
  const result = await migrationService.rollbackMigration(options.backupId);
  
  console.log('\n=== ROLLBACK RESULTS ===');
  console.log(`✅ Success: ${result.success ? 'Yes' : 'No'}`);
  console.log(`📊 Restored: ${result.restored}`);
  console.log(`❌ Errors: ${result.errors.length}`);
  console.log(`⏱️  Duration: ${result.duration}ms`);
  
  if (result.errors.length > 0) {
    console.log('\n=== ERRORS ===');
    result.errors.forEach((error, index) => {
      console.log(`${index + 1}. Spiel ${error.spielId}: ${error.error} (${error.severity})`);
    });
  }
  
  if (result.success) {
    console.log('\n🎉 Rollback completed successfully!');
  } else {
    console.log('\n❌ Rollback completed with errors. Check the logs above.');
  }
}

function showUsage() {
  console.log(`
Usage: node scripts/migrate-spiele-to-clubs.js [options]

Options:
  --dry-run              Run validation only, don't perform migration
  --rollback             Rollback using backup ID (requires --backup-id)
  --backup-id <id>       Backup ID for rollback
  --force                Skip confirmation prompts

Examples:
  node scripts/migrate-spiele-to-clubs.js --dry-run
  node scripts/migrate-spiele-to-clubs.js
  node scripts/migrate-spiele-to-clubs.js --force
  node scripts/migrate-spiele-to-clubs.js --rollback --backup-id spiel-migration-backup-2024-01-15T10-30-00-000Z
`);
}

// Show usage if help requested
if (args.includes('--help') || args.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Run the migration
runMigration();