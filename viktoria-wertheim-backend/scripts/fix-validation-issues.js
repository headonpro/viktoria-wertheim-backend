#!/usr/bin/env node

/**
 * Simple Validation Fix Runner
 * 
 * This is a simplified entry point for running the comprehensive validation fix.
 * It provides common usage patterns and command-line options.
 * 
 * Usage Examples:
 *   node scripts/fix-validation-issues.js                    # Interactive mode
 *   node scripts/fix-validation-issues.js --dry-run          # Preview changes
 *   node scripts/fix-validation-issues.js --auto-confirm     # Non-interactive
 *   node scripts/fix-validation-issues.js --skip-backup     # Skip backup creation
 *   node scripts/fix-validation-issues.js --verbose         # Detailed output
 */

const { program } = require('commander');
const { runComprehensiveValidationFix } = require('./run-comprehensive-validation-fix');

// Configure CLI options
program
  .name('fix-validation-issues')
  .description('Fix validation issues between admin interface and API')
  .version('1.0.0')
  .option('--dry-run', 'Preview changes without making modifications')
  .option('--auto-confirm', 'Skip interactive confirmations (use defaults)')
  .option('--skip-backup', 'Skip database backup creation (not recommended)')
  .option('--verbose', 'Enable detailed logging output')
  .option('--non-interactive', 'Run in non-interactive mode')
  .option('--strapi-url <url>', 'Strapi server URL', 'http://localhost:1337')
  .option('--admin-email <email>', 'Admin email for authentication', 'admin@viktoria-wertheim.de')
  .option('--admin-password <password>', 'Admin password for authentication', 'admin123')
  .parse();

const options = program.opts();

// Set environment variables based on CLI options
if (options.dryRun) {
  process.env.DRY_RUN = 'true';
  console.log('🔍 DRY RUN MODE: No changes will be made to the system');
}

if (options.autoConfirm) {
  process.env.AUTO_CONFIRM = 'true';
  console.log('🤖 AUTO-CONFIRM MODE: Using default answers for all prompts');
}

if (options.skipBackup) {
  process.env.SKIP_BACKUP = 'true';
  console.log('⚠️ SKIP BACKUP MODE: No database backup will be created');
}

if (options.verbose) {
  process.env.VERBOSE = 'true';
  console.log('📝 VERBOSE MODE: Detailed logging enabled');
}

if (options.nonInteractive) {
  process.env.INTERACTIVE = 'false';
  console.log('🔇 NON-INTERACTIVE MODE: No user prompts will be shown');
}

if (options.strapiUrl) {
  process.env.STRAPI_URL = options.strapiUrl;
  console.log(`🌐 Strapi URL: ${options.strapiUrl}`);
}

if (options.adminEmail) {
  process.env.ADMIN_EMAIL = options.adminEmail;
  console.log(`👤 Admin Email: ${options.adminEmail}`);
}

if (options.adminPassword) {
  process.env.ADMIN_PASSWORD = options.adminPassword;
  console.log('🔑 Admin Password: [CONFIGURED]');
}

// Display banner
console.log('\n' + '='.repeat(60));
console.log('🔧 VIKTORIA WERTHEIM VALIDATION FIX UTILITY');
console.log('='.repeat(60));
console.log('This tool will diagnose and fix validation issues between');
console.log('the Strapi admin interface and API endpoints.');
console.log('='.repeat(60));

// Show current configuration
console.log('\n📋 CONFIGURATION:');
console.log(`   Strapi URL: ${process.env.STRAPI_URL || 'http://localhost:1337'}`);
console.log(`   Admin Email: ${process.env.ADMIN_EMAIL || 'admin@viktoria-wertheim.de'}`);
console.log(`   Dry Run: ${process.env.DRY_RUN === 'true' ? 'YES' : 'NO'}`);
console.log(`   Auto Confirm: ${process.env.AUTO_CONFIRM === 'true' ? 'YES' : 'NO'}`);
console.log(`   Skip Backup: ${process.env.SKIP_BACKUP === 'true' ? 'YES' : 'NO'}`);
console.log(`   Verbose: ${process.env.VERBOSE === 'true' ? 'YES' : 'NO'}`);
console.log(`   Interactive: ${process.env.INTERACTIVE !== 'false' ? 'YES' : 'NO'}`);

// Show safety information
if (process.env.DRY_RUN !== 'true') {
  console.log('\n⚠️ SAFETY INFORMATION:');
  console.log('   - This tool will make changes to your database');
  console.log('   - A backup will be created before making changes');
  console.log('   - Rollback scripts will be generated for recovery');
  console.log('   - You can preview changes with --dry-run first');
}

// Run the comprehensive validation fix
console.log('\n🚀 Starting validation fix process...\n');

runComprehensiveValidationFix()
  .then(() => {
    console.log('\n✅ Validation fix process completed successfully!');
  })
  .catch((error) => {
    console.error('\n❌ Validation fix process failed:', error.message);
    if (process.env.VERBOSE === 'true') {
      console.error(error.stack);
    }
    process.exit(1);
  });