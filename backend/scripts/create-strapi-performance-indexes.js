/**
 * Strapi-based Performance Index Creation Script
 * Creates database indexes using Strapi's database connection
 */

const strapi = require('@strapi/strapi');

async function createPerformanceIndexes() {
  console.log('🚀 Creating performance indexes via Strapi...');

  let app;
  try {
    // Initialize Strapi
    app = await strapi().load();
    const db = app.db.connection;

    console.log('📊 Creating database indexes...');

    // Get the actual table name from Strapi
    const tableName = 'tabellen_eintraege';

    const indexes = [
      {
        name: 'idx_tabellen_eintraege_liga',
        sql: `CREATE INDEX IF NOT EXISTS idx_tabellen_eintraege_liga ON ${tableName}(liga);`
      },
      {
        name: 'idx_tabellen_eintraege_platz', 
        sql: `CREATE INDEX IF NOT EXISTS idx_tabellen_eintraege_platz ON ${tableName}(platz);`
      },
      {
        name: 'idx_tabellen_eintraege_liga_platz',
        sql: `CREATE INDEX IF NOT EXISTS idx_tabellen_eintraege_liga_platz ON ${tableName}(liga, platz);`
      },
      {
        name: 'idx_tabellen_eintraege_team_name',
        sql: `CREATE INDEX IF NOT EXISTS idx_tabellen_eintraege_team_name ON ${tableName}(team_name);`
      }
    ];

    for (const index of indexes) {
      try {
        await db.raw(index.sql);
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Index already exists: ${index.name}`);
        } else {
          console.error(`❌ Failed to create index ${index.name}:`, error.message);
        }
      }
    }

    // Analyze table for query optimization
    console.log('📈 Analyzing table for query optimization...');
    try {
      await db.raw(`ANALYZE ${tableName};`);
      console.log('✅ Table analysis completed');
    } catch (error) {
      console.warn(`⚠️  Table analysis failed: ${error.message}`);
    }

    // Show created indexes
    console.log('\n📋 Checking created indexes...');
    try {
      const result = await db.raw(`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = ?
        AND indexname LIKE 'idx_tabellen_eintraege%'
      `, [tableName]);
      
      if (result.rows && result.rows.length > 0) {
        result.rows.forEach(row => {
          console.log(`   ${row.indexname}: ${row.indexdef}`);
        });
      } else {
        console.log('   No custom indexes found');
      }
    } catch (error) {
      console.warn(`⚠️  Could not show indexes: ${error.message}`);
    }

    console.log('\n🎉 Performance indexes setup completed!');

  } catch (error) {
    console.error('❌ Error setting up performance indexes:', error);
    process.exit(1);
  } finally {
    if (app) {
      await app.destroy();
    }
  }
}

// Run if called directly
if (require.main === module) {
  createPerformanceIndexes();
}

module.exports = { createPerformanceIndexes };