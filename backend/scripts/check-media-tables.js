const { Client } = require('pg');

async function checkMediaTables() {
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

    // Check for media-related tables
    console.log('\n📋 Checking media-related tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%file%' OR table_name LIKE '%media%' OR table_name LIKE '%upload%' OR table_name LIKE '%teamfoto%')
      ORDER BY table_name
    `);

    console.log('Media-related tables:');
    tablesResult.rows.forEach(row => console.log(`- ${row.table_name}`));

    // Check for any link tables related to teams
    console.log('\n🔗 Checking team link tables...');
    const linkTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%team%lnk%'
      ORDER BY table_name
    `);

    console.log('Team link tables:');
    linkTablesResult.rows.forEach(row => console.log(`- ${row.table_name}`));

    // Check files table if it exists
    const filesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'files'
    `);

    if (filesCheck.rows.length > 0) {
      console.log('\n📁 Files table exists, checking structure...');
      const filesColumns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'files' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);

      filesColumns.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking media tables:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// If run directly
if (require.main === module) {
  checkMediaTables().then(() => {
    console.log('\n✅ Media tables check completed');
    process.exit(0);
  }).catch(error => {
    process.exit(1);
  });
}

module.exports = checkMediaTables;