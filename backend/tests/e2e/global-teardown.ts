/**
 * Global Teardown for E2E Tests
 * Cleans up test environment and resources
 */

import { performance } from 'perf_hooks';

export default async function globalTeardown() {
  const startTime = performance.now();
  
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Clean up test database
  await cleanupTestDatabase();
  
  // Clean up temporary files
  await cleanupTempFiles();
  
  // Generate test summary
  await generateTestSummary();
  
  const teardownTime = performance.now() - startTime;
  console.log(`⏱️  Global teardown completed in ${Math.round(teardownTime)}ms`);
  console.log('✅ E2E test environment cleaned up');
}

async function cleanupTestDatabase() {
  if (process.env.AUTO_CLEANUP !== 'true') {
    console.log('⏭️  Database cleanup skipped (AUTO_CLEANUP=false)');
    return;
  }
  
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    
    // Clean up test data in reverse dependency order
    const cleanupQueries = [
      'DELETE FROM tabellen_eintraege WHERE liga_id IN (SELECT id FROM ligen WHERE name LIKE \'%Test%\' OR name LIKE \'%E2E%\')',
      'DELETE FROM spiele WHERE liga_id IN (SELECT id FROM ligen WHERE name LIKE \'%Test%\' OR name LIKE \'%E2E%\')',
      'DELETE FROM clubs_ligen_links WHERE club_id IN (SELECT id FROM clubs WHERE name LIKE \'%Test%\' OR name LIKE \'%E2E%\')',
      'DELETE FROM clubs WHERE name LIKE \'%Test%\' OR name LIKE \'%E2E%\'',
      'DELETE FROM ligen WHERE name LIKE \'%Test%\' OR name LIKE \'%E2E%\'',
      'DELETE FROM saisonen WHERE name LIKE \'%Test%\' OR name LIKE \'%E2E%\''
    ];
    
    for (const query of cleanupQueries) {
      try {
        const result = await client.query(query);
        if (result.rowCount > 0) {
          console.log(`🗑️  Cleaned up ${result.rowCount} records`);
        }
      } catch (error) {
        console.warn(`⚠️  Cleanup query failed: ${error.message}`);
      }
    }
    
    await client.end();
    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
  }
}

async function cleanupTempFiles() {
  try {
    const fs = require('fs/promises');
    const path = require('path');
    
    // Clean up test snapshots
    const snapshotDir = path.join(process.cwd(), 'test-snapshots');
    try {
      await fs.rmdir(snapshotDir, { recursive: true });
      console.log('🗑️  Test snapshots cleaned up');
    } catch (error) {
      // Directory might not exist, which is fine
    }
    
    // Clean up temporary uploads
    const tempUploadsDir = path.join(process.cwd(), 'public', 'uploads', 'test');
    try {
      await fs.rmdir(tempUploadsDir, { recursive: true });
      console.log('🗑️  Temporary uploads cleaned up');
    } catch (error) {
      // Directory might not exist, which is fine
    }
    
    console.log('✅ Temporary files cleaned up');
  } catch (error) {
    console.error('❌ Temporary file cleanup failed:', error.message);
  }
}

async function generateTestSummary() {
  try {
    const fs = require('fs/promises');
    const path = require('path');
    
    const summaryPath = path.join(process.cwd(), 'coverage', 'e2e', 'test-summary.json');
    
    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not configured',
        frontendUrl: process.env.FRONTEND_URL || 'not configured'
      },
      testConfiguration: {
        timeout: 120000,
        maxWorkers: 1,
        autoCleanup: process.env.AUTO_CLEANUP === 'true',
        performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true'
      },
      coverage: {
        requirements: [
          'Complete workflow from game entry to table display',
          'Frontend integration testing with club data',
          'Admin panel club management workflows', 
          'Performance testing under realistic load'
        ],
        testFiles: [
          'complete-club-workflow.test.ts',
          'performance-load-testing.test.ts',
          'admin-panel-workflows.test.ts',
          'e2e-test-runner.ts'
        ],
        frontendTests: [
          'club-frontend-integration.test.ts'
        ]
      }
    };
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(summaryPath), { recursive: true });
    
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Test summary generated: ${summaryPath}`);
  } catch (error) {
    console.error('❌ Test summary generation failed:', error.message);
  }
}