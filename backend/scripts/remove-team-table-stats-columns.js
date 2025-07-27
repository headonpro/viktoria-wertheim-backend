const { Client } = require('pg');

async function removeTableStatsColumns() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'viktoria_wertheim',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // List of columns to remove
    const columnsToRemove = [
      'tabellenplatz',
      'punkte', 
      'spiele_gesamt',
      'siege',
      'unentschieden', 
      'niederlagen',
      'tore_fuer',
      'tore_gegen',
      'tordifferenz'
    ];

    console.log('\n🗑️ Removing table statistics columns from teams table...');
    
    // Check which columns actually exist before trying to drop them
    const existingColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'teams' 
      AND table_schema = 'public'
      AND column_name = ANY($1)
    `, [columnsToRemove]);

    const existingColumnNames = existingColumns.rows.map(row => row.column_name);
    console.log(`Found ${existingColumnNames.length} columns to remove:`, existingColumnNames);

    // Remove each column
    for (const columnName of existingColumnNames) {
      try {
        await client.query(`ALTER TABLE teams DROP COLUMN IF EXISTS ${columnName}`);
        console.log(`✅ Removed column: ${columnName}`);
      } catch (error) {
        console.error(`❌ Failed to remove column ${columnName}:`, error.message);
      }
    }

    // Verify the final schema
    console.log('\n📋 Final teams table structure:');
    const finalColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'teams' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    finalColumns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    console.log('\n✅ Table statistics columns removed successfully!');
    return {
      removedColumns: existingColumnNames,
      remainingColumns: finalColumns.rows.map(col => col.column_name)
    };

  } catch (error) {
    console.error('❌ Error removing table statistics columns:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// If run directly
if (require.main === module) {
  removeTableStatsColumns().then((result) => {
    console.log(`\n🎉 Column removal completed!`);
    console.log(`- Removed ${result.removedColumns.length} columns`);
    console.log(`- Remaining ${result.remainingColumns.length} columns`);
    process.exit(0);
  }).catch(error => {
    console.error('❌ Column removal failed:', error);
    process.exit(1);
  });
}

module.exports = removeTableStatsColumns;