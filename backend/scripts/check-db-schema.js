/**
 * Check database schema for tabellen_eintraege table
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

async function checkSchema() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if tabellen_eintraege table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%tabellen%'
    `);
    
    console.log('\n📊 Tables with "tabellen" in name:');
    tableCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Get column information for tabellen_eintraege table
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tabellen_eintraege'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columns in tabellen_eintraege table:');
    if (columnCheck.rows.length === 0) {
      console.log('  ❌ Table does not exist or has no columns');
    } else {
      columnCheck.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }

    // Check ligas table too
    const ligaColumnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ligas'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columns in ligas table:');
    if (ligaColumnCheck.rows.length === 0) {
      console.log('  ❌ Table does not exist or has no columns');
    } else {
      ligaColumnCheck.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();