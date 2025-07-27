/**
 * Performance Optimization Script
 * Creates database indexes for liga-tabellen-system performance
 */

const { execSync } = require('child_process');

async function createPerformanceIndexes() {
  console.log('🚀 Creating performance indexes for liga-tabellen-system...');

  try {
    // Database indexes for tabellen_eintraege table
    const indexes = [
      // Index for liga field (most common filter)
      `CREATE INDEX IF NOT EXISTS idx_tabellen_eintraege_liga 
       ON tabellen_eintraege(liga);`,
      
      // Index for platz field (sorting)
      `CREATE INDEX IF NOT EXISTS idx_tabellen_eintraege_platz 
       ON tabellen_eintraege(platz);`,
      
      // Composite index for liga + platz (optimal for filtered sorting)
      `CREATE INDEX IF NOT EXISTS idx_tabellen_eintraege_liga_platz 
       ON tabellen_eintraege(liga, platz);`,
      
      // Index for team_name (search functionality)
      `CREATE INDEX IF NOT EXISTS idx_tabellen_eintraege_team_name 
       ON tabellen_eintraege(team_name);`
    ];

    console.log('📊 Creating database indexes...');
    
    for (const indexQuery of indexes) {
      try {
        // Execute via psql command
        const command = `psql "${process.env.DATABASE_URL}" -c "${indexQuery}"`;
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ Index created successfully`);
      } catch (error) {
        console.log(`⚠️  Index might already exist or error occurred: ${error.message}`);
      }
    }

    // Analyze table for query optimization
    console.log('📈 Analyzing table for query optimization...');
    try {
      const analyzeCommand = `psql "${process.env.DATABASE_URL}" -c "ANALYZE tabellen_eintraege;"`;
      execSync(analyzeCommand, { stdio: 'inherit' });
      console.log('✅ Table analysis completed');
    } catch (error) {
      console.log(`⚠️  Table analysis failed: ${error.message}`);
    }

    console.log('🎉 Performance indexes created successfully!');
    
    // Show index information
    console.log('\n📋 Checking created indexes...');
    try {
      const showIndexesCommand = `psql "${process.env.DATABASE_URL}" -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'tabellen_eintraege';"`;
      execSync(showIndexesCommand, { stdio: 'inherit' });
    } catch (error) {
      console.log(`⚠️  Could not show indexes: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error creating performance indexes:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createPerformanceIndexes();
}

module.exports = { createPerformanceIndexes };