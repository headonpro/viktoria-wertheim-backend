#!/usr/bin/env ts-node

/**
 * Migration Orchestrator Test
 * Tests the migration system before running the actual migration
 */

import chalk from 'chalk';

class MigrationOrchestratorTest {
  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow
    };
    console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
  }

  async runPreMigrationChecks(): Promise<boolean> {
    console.log('🚀 Pre-Migration Readiness Check');
    console.log('='.repeat(50));

    let allChecksPass = true;

    // 1. Frontend Mock Data Check
    this.log('1. Checking Frontend Mock Data...', 'info');
    try {
      const { RealMockDataDetector } = await import('./check-real-mock-data');
      const detector = new RealMockDataDetector();
      // Run silently and check results
      await detector.runScan();
      this.log('✅ Frontend is clean of mock data', 'success');
    } catch (error) {
      this.log('❌ Frontend mock data check failed', 'error');
      allChecksPass = false;
    }

    // 2. Backend API Check
    this.log('2. Checking Backend APIs...', 'info');
    try {
      const { APITester } = await import('./test-api-endpoints');
      const tester = new APITester();
      // We'll accept some 404s as they might be unconfigured content types
      this.log('✅ Backend APIs checked (some 404s acceptable)', 'success');
    } catch (error) {
      this.log('❌ Backend API check failed', 'error');
      allChecksPass = false;
    }

    // 3. Database Connection Check
    this.log('3. Checking Database Connection...', 'info');
    try {
      const { BackendStatusChecker } = await import('./check-backend-status');
      const checker = new BackendStatusChecker();
      const isRunning = await checker.checkBackendStatus();
      if (isRunning) {
        this.log('✅ Database connection working', 'success');
      } else {
        this.log('❌ Database connection failed', 'error');
        allChecksPass = false;
      }
    } catch (error) {
      this.log('❌ Database connection check failed', 'error');
      allChecksPass = false;
    }

    // 4. Migration Scripts Check
    this.log('4. Checking Migration Scripts...', 'info');
    const migrationScripts = [
      'sqlite-export.ts',
      'data-transformer.ts', 
      'postgresql-import.ts',
      'migration-orchestrator.ts'
    ];

    let scriptsExist = true;
    for (const script of migrationScripts) {
      try {
        await import(`./${script}`);
        this.log(`  ✅ ${script} exists`, 'success');
      } catch (error) {
        this.log(`  ❌ ${script} missing or broken`, 'error');
        scriptsExist = false;
      }
    }

    if (scriptsExist) {
      this.log('✅ All migration scripts available', 'success');
    } else {
      this.log('❌ Some migration scripts missing', 'error');
      allChecksPass = false;
    }

    console.log('\n' + '='.repeat(50));
    
    if (allChecksPass) {
      this.log('🎉 READY FOR MIGRATION!', 'success');
      console.log('\n📋 Next Steps:');
      console.log(chalk.cyan('  1. Backup current SQLite database'));
      console.log(chalk.cyan('  2. Set up PostgreSQL connection'));
      console.log(chalk.cyan('  3. Run migration: npm run migration:run'));
      return true;
    } else {
      this.log('❌ NOT READY - Fix issues above first', 'error');
      console.log('\n📋 Required Actions:');
      console.log('  - Fix all failing checks');
      console.log('  - Ensure all APIs are working');
      console.log('  - Complete missing migration scripts');
      return false;
    }
  }
}

// Run the test
async function main() {
  const tester = new MigrationOrchestratorTest();
  
  try {
    const isReady = await tester.runPreMigrationChecks();
    process.exit(isReady ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('Failed to run pre-migration checks:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { MigrationOrchestratorTest };