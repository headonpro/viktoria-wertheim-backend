const { Client } = require('pg');
const sqlite3 = require('better-sqlite3');
const path = require('path');

async function testDatabaseConnection() {
  console.log('🔍 Testing actual database connection...');
  
  // Test 1: Check environment variables
  console.log('\n1️⃣ Environment Configuration:');
  console.log('DATABASE_CLIENT:', process.env.DATABASE_CLIENT || 'not set');
  console.log('DATABASE_HOST:', process.env.DATABASE_HOST || 'not set');
  console.log('DATABASE_PORT:', process.env.DATABASE_PORT || 'not set');
  console.log('DATABASE_NAME:', process.env.DATABASE_NAME || 'not set');
  console.log('DATABASE_USERNAME:', process.env.DATABASE_USERNAME || 'not set');
  console.log('DATABASE_PASSWORD:', process.env.DATABASE_PASSWORD ? '***set***' : 'not set');
  
  // Test 2: Try PostgreSQL connection
  console.log('\n2️⃣ Testing PostgreSQL connection...');
  try {
    const pgClient = new Client({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT) || 5432,
      database: process.env.DATABASE_NAME || 'viktoria_wertheim',
      user: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres123'
    });
    
    await pgClient.connect();
    console.log('✅ PostgreSQL connection successful!');
    
    // Check if mannschaften table exists in PostgreSQL
    const result = await pgClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'mannschaften'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ mannschaften table exists in PostgreSQL');
      
      // Count rows
      const countResult = await pgClient.query('SELECT COUNT(*) FROM mannschaften');
      console.log(`📊 PostgreSQL mannschaften count: ${countResult.rows[0].count}`);
    } else {
      console.log('❌ mannschaften table does NOT exist in PostgreSQL');
    }
    
    await pgClient.end();
    
  } catch (error) {
    console.log('❌ PostgreSQL connection failed:', error.message);
  }
  
  // Test 3: Check SQLite
  console.log('\n3️⃣ Testing SQLite...');
  try {
    const dbPath = path.join(__dirname, '../.tmp/data.db');
    console.log('SQLite path:', dbPath);
    
    const fs = require('fs');
    if (fs.existsSync(dbPath)) {
      console.log('✅ SQLite file exists');
      
      const db = sqlite3(dbPath);
      const count = db.prepare('SELECT COUNT(*) as count FROM mannschaften').get();
      console.log(`📊 SQLite mannschaften count: ${count.count}`);
      db.close();
    } else {
      console.log('❌ SQLite file does NOT exist');
    }
    
  } catch (error) {
    console.log('❌ SQLite test failed:', error.message);
  }
  
  // Test 4: Test Strapi API to see which DB it's actually using
  console.log('\n4️⃣ Testing Strapi API response...');
  try {
    const axios = require('axios');
    const response = await axios.get('http://localhost:1337/api/mannschaften');
    console.log(`✅ API accessible, returned ${response.data.data.length} mannschaften`);
    
    if (response.data.data.length > 0) {
      console.log('Sample mannschaft:', response.data.data[0].attributes.name);
    }
    
  } catch (error) {
    console.log('❌ API test failed:', error.message);
  }
  
  console.log('\n🎯 Diagnosis:');
  console.log('If PostgreSQL connection works but mannschaften table is missing,');
  console.log('Strapi hasn\'t migrated the schema to PostgreSQL yet.');
  console.log('If SQLite still has data, Strapi is still using SQLite.');
}

// Load environment variables
require('dotenv').config();
testDatabaseConnection();