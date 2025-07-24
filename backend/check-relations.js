/**
 * Check relation tables structure
 */

const { Client } = require('pg');

async function checkRelations() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'viktoria_wertheim',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check all tables that might contain spiel relations
    console.log('🔍 Checking all tables...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%spiel%'
      ORDER BY table_name;
    `);
    
    console.log('Spiel-related tables:');
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Check relation link tables
    console.log('\n🔍 Checking relation link tables...');
    const linkTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%_lnk'
      ORDER BY table_name;
    `);
    
    console.log('Link tables:');
    linkTables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Check specific link tables for spiele
    const spielLinkTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%spiel%lnk' OR table_name LIKE 'spiel%lnk')
      ORDER BY table_name;
    `);
    
    console.log('\nSpiel link tables:');
    spielLinkTables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Check the structure of potential link tables
    const potentialTables = [
      'spiele_heimclub_lnk',
      'spiele_auswaertsclub_lnk', 
      'spiele_unser_team_lnk',
      'spiele_liga_lnk',
      'spiele_saison_lnk'
    ];

    for (const tableName of potentialTables) {
      try {
        const structure = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position;
        `, [tableName]);
        
        if (structure.rows.length > 0) {
          console.log(`\n📋 Structure of ${tableName}:`);
          structure.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type}`);
          });
        }
      } catch (error) {
        // Table doesn't exist, ignore
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkRelations();