const sqlite3 = require('better-sqlite3');
const path = require('path');

function debugDatabaseTables() {
  console.log('🔍 Debugging database tables...');
  
  try {
    const dbPath = path.join(__dirname, '../.tmp/data.db');
    console.log(`Database path: ${dbPath}`);
    
    const db = sqlite3(dbPath);
    
    // Get all table names
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\n📋 Available tables:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Check if mannschaften table exists and get its structure
    const mannschaftenTable = tables.find(t => t.name.includes('mannschaft'));
    if (mannschaftenTable) {
      console.log(`\n🏆 Found mannschaften table: ${mannschaftenTable.name}`);
      
      // Get table info
      const tableInfo = db.prepare(`PRAGMA table_info(${mannschaftenTable.name})`).all();
      console.log('\n📊 Table structure:');
      tableInfo.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
      });
      
      // Get row count
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${mannschaftenTable.name}`).get();
      console.log(`\n📈 Row count: ${count.count}`);
      
      // Get sample data if exists
      if (count.count > 0) {
        const sampleData = db.prepare(`SELECT * FROM ${mannschaftenTable.name} LIMIT 3`).all();
        console.log('\n📄 Sample data:');
        sampleData.forEach((row, index) => {
          console.log(`  Row ${index + 1}:`, JSON.stringify(row, null, 2));
        });
      }
    } else {
      console.log('\n❌ No mannschaften table found');
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error debugging database:', error);
  }
}

debugDatabaseTables();