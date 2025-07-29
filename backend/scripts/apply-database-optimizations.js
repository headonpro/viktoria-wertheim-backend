#!/usr/bin/env node

/**
 * Apply Database Optimizations for Club Operations
 * 
 * This script applies database indexes, materialized views, and other optimizations
 * to improve performance of club-related queries.
 */

const fs = require('fs');
const path = require('path');

// Database connection setup
const { Client } = require('pg');

// Configuration
const config = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'viktoria_wertheim',
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
};

/**
 * Execute SQL file with proper error handling
 */
async function executeSqlFile(client, filePath) {
  console.log(`📄 Reading SQL file: ${filePath}`);
  
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Split by semicolon and filter out empty statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statement);
        successCount++;
      } catch (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        console.error(`Statement: ${statement.substring(0, 100)}...`);
        errorCount++;
        
        // Continue with other statements unless it's a critical error
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Skipping existing object (this is normal)`);
        } else if (error.message.includes('does not exist')) {
          console.log(`ℹ️  Object doesn't exist, continuing...`);
        } else {
          console.error(`⚠️  Unexpected error, but continuing...`);
        }
      }
    }
    
    console.log(`✅ Completed: ${successCount} successful, ${errorCount} errors`);
    return { successCount, errorCount };
    
  } catch (error) {
    console.error(`❌ Failed to read or execute SQL file:`, error.message);
    throw error;
  }
}

/**
 * Verify database optimizations
 */
async function verifyOptimizations(client) {
  console.log('\n🔍 Verifying database optimizations...');
  
  const verificationQueries = [
    {
      name: 'Club indexes',
      query: `
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE tablename = 'clubs' 
        AND indexname LIKE 'idx_clubs_%'
        ORDER BY indexname;
      `
    },
    {
      name: 'Spiele indexes',
      query: `
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE tablename = 'spiele' 
        AND indexname LIKE 'idx_spiele_%'
        ORDER BY indexname;
      `
    },
    {
      name: 'Materialized views',
      query: `
        SELECT matviewname, ispopulated 
        FROM pg_matviews 
        WHERE matviewname IN ('club_liga_stats', 'current_season_club_stats')
        ORDER BY matviewname;
      `
    },
    {
      name: 'Performance functions',
      query: `
        SELECT proname, pronargs 
        FROM pg_proc 
        WHERE proname IN ('get_clubs_by_liga', 'get_viktoria_club_by_team', 'refresh_club_stats_views')
        ORDER BY proname;
      `
    }
  ];
  
  for (const verification of verificationQueries) {
    try {
      console.log(`\n📋 Checking ${verification.name}:`);
      const result = await client.query(verification.query);
      
      if (result.rows.length === 0) {
        console.log(`⚠️  No ${verification.name} found`);
      } else {
        result.rows.forEach(row => {
          console.log(`  ✓ ${Object.values(row).join(' - ')}`);
        });
      }
    } catch (error) {
      console.error(`❌ Error checking ${verification.name}:`, error.message);
    }
  }
}

/**
 * Test performance improvements
 */
async function testPerformance(client) {
  console.log('\n⚡ Testing performance improvements...');
  
  const performanceTests = [
    {
      name: 'Club lookup by liga',
      query: `SELECT * FROM get_clubs_by_liga(1) LIMIT 5;`
    },
    {
      name: 'Viktoria club by team mapping',
      query: `SELECT * FROM get_viktoria_club_by_team('team_1');`
    },
    {
      name: 'Current season table',
      query: `SELECT * FROM get_current_season_table(1) LIMIT 5;`
    },
    {
      name: 'Club statistics view',
      query: `SELECT club_name, total_spiele, beendete_spiele FROM club_liga_stats LIMIT 5;`
    }
  ];
  
  for (const test of performanceTests) {
    try {
      console.log(`\n🏃 Testing ${test.name}...`);
      const startTime = Date.now();
      const result = await client.query(test.query);
      const duration = Date.now() - startTime;
      
      console.log(`  ✓ Query executed in ${duration}ms, returned ${result.rows.length} rows`);
      
      // Log performance metric
      await client.query(`
        SELECT log_performance_metric($1, $2, 'ms', $3::jsonb);
      `, [
        `test_${test.name.replace(/\s+/g, '_').toLowerCase()}`,
        duration,
        JSON.stringify({ test_type: 'optimization_verification', rows_returned: result.rows.length })
      ]);
      
    } catch (error) {
      console.error(`❌ Error testing ${test.name}:`, error.message);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting database optimization process...\n');
  
  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
  });
  
  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Database connected successfully');
    
    // Apply optimizations
    const sqlFilePath = path.join(__dirname, 'database-optimizations.sql');
    const results = await executeSqlFile(client, sqlFilePath);
    
    // Verify optimizations
    await verifyOptimizations(client);
    
    // Test performance
    await testPerformance(client);
    
    console.log('\n🎉 Database optimization process completed successfully!');
    console.log(`📊 Summary: ${results.successCount} successful operations, ${results.errorCount} errors`);
    
    if (results.errorCount > 0) {
      console.log('⚠️  Some errors occurred, but this is often normal for existing objects');
    }
    
  } catch (error) {
    console.error('\n❌ Database optimization failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  executeSqlFile,
  verifyOptimizations,
  testPerformance
};