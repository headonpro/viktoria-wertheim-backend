/**
 * Check link table schema for tabellen_eintraege relations
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load environment variables manually
try {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.log('⚠️  Could not load .env file, using default values');
}

// Database configuration from .env
const DB_CONFIG = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'viktoria_wertheim',
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
};

async function checkLinkTables() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check tabellen_eintraege_liga_lnk table
    const ligaLinkCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tabellen_eintraege_liga_lnk'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columns in tabellen_eintraege_liga_lnk table:');
    ligaLinkCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Check tabellen_eintraege_team_lnk table
    const teamLinkCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tabellen_eintraege_team_lnk'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columns in tabellen_eintraege_team_lnk table:');
    teamLinkCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Check existing data in tabellen_eintraege
    const existingData = await client.query('SELECT * FROM tabellen_eintraege LIMIT 5');
    console.log('\n📊 Sample data in tabellen_eintraege:');
    console.log(existingData.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkLinkTables();