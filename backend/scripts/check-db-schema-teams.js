const { Client } = require('pg');

async function checkDatabaseSchema() {
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

    // Check what tables exist
    console.log('\n📋 Checking available tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%team%'
      ORDER BY table_name
    `);

    console.log('Tables with "team" in name:');
    tablesResult.rows.forEach(row => console.log(`- ${row.table_name}`));

    // Check teams table structure
    if (tablesResult.rows.some(row => row.table_name === 'teams')) {
      console.log('\n🔍 Teams table structure:');
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'teams' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);

      columnsResult.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });

      // Check current teams data
      console.log('\n📊 Current teams data:');
      const teamsData = await client.query('SELECT * FROM teams LIMIT 10');
      console.log(`Found ${teamsData.rows.length} teams (showing first 10):`);
      teamsData.rows.forEach(team => {
        console.log(`- ID: ${team.id}, Name: ${team.name}, Type: ${team.team_typ || 'N/A'}`);
      });
    }

    // Check ligas table
    console.log('\n🏆 Checking ligas table...');
    const ligasCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'ligas'
    `);

    if (ligasCheck.rows.length > 0) {
      const ligasData = await client.query('SELECT id, name FROM ligas');
      console.log('Available ligas:');
      ligasData.rows.forEach(liga => console.log(`- ${liga.id}: ${liga.name}`));
    } else {
      console.log('❌ Ligas table not found');
    }

  } catch (error) {
    console.error('❌ Error checking database schema:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// If run directly
if (require.main === module) {
  checkDatabaseSchema().then(() => {
    console.log('\n✅ Schema check completed');
    process.exit(0);
  }).catch(error => {
    process.exit(1);
  });
}

module.exports = checkDatabaseSchema;