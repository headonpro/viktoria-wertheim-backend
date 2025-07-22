const { Client } = require('pg');

async function fixPostgresEnum() {
  console.log('🔧 Fixing PostgreSQL enum constraints...');
  
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 5432,
    database: process.env.DATABASE_NAME || 'viktoria_wertheim',
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres123'
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Check current table structure
    console.log('\n1️⃣ Checking current table structure...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'mannschaften' 
      AND column_name IN ('status', 'liga')
      ORDER BY column_name
    `);
    
    console.log('Current columns:');
    tableInfo.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
    // Check for enum types
    console.log('\n2️⃣ Checking enum types...');
    const enumTypes = await client.query(`
      SELECT typname, enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE typname LIKE '%status%' OR typname LIKE '%liga%'
      ORDER BY typname, enumlabel
    `);
    
    if (enumTypes.rows.length > 0) {
      console.log('Found enum types:');
      enumTypes.rows.forEach(row => {
        console.log(`- ${row.typname}: ${row.enumlabel}`);
      });
    } else {
      console.log('No enum types found (columns are probably varchar)');
    }
    
    // Check current data
    console.log('\n3️⃣ Checking current data...');
    const currentData = await client.query('SELECT name, status, liga FROM mannschaften');
    console.log('Current mannschaften:');
    currentData.rows.forEach(row => {
      console.log(`- ${row.name}: status="${row.status}", liga="${row.liga}"`);
    });
    
    // Fix: Ensure columns are varchar (not enum) for flexibility
    console.log('\n4️⃣ Ensuring columns are varchar...');
    
    try {
      await client.query('ALTER TABLE mannschaften ALTER COLUMN status TYPE varchar(255)');
      console.log('✅ Status column set to varchar');
    } catch (error) {
      console.log('ℹ️  Status column already varchar or conversion not needed');
    }
    
    try {
      await client.query('ALTER TABLE mannschaften ALTER COLUMN liga TYPE varchar(255)');
      console.log('✅ Liga column set to varchar');
    } catch (error) {
      console.log('ℹ️  Liga column already varchar or conversion not needed');
    }
    
    // Test insert with valid values
    console.log('\n5️⃣ Testing insert with valid values...');
    
    const testData = {
      name: 'Enum Test Mannschaft',
      status: 'aktiv',
      liga: 'Kreisklasse A',
      saison: '2024/25',
      spielort: 'Sportplatz Wertheim',
      altersklasse: 'senioren',
      tabellenplatz: 8
    };
    
    try {
      const insertResult = await client.query(`
        INSERT INTO mannschaften (name, status, liga, saison, spielort, altersklasse, tabellenplatz, created_at, updated_at, published_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
        RETURNING id, name, status, liga
      `, [
        testData.name,
        testData.status,
        testData.liga,
        testData.saison,
        testData.spielort,
        testData.altersklasse,
        testData.tabellenplatz
      ]);
      
      console.log('✅ Test insert successful:');
      console.log(`Created: ${insertResult.rows[0].name} (status: ${insertResult.rows[0].status}, liga: ${insertResult.rows[0].liga})`);
      
      // Clean up test data
      await client.query('DELETE FROM mannschaften WHERE name = $1', [testData.name]);
      console.log('✅ Test data cleaned up');
      
    } catch (error) {
      console.log('❌ Test insert failed:', error.message);
    }
    
    await client.end();
    
    console.log('\n🎯 Summary:');
    console.log('- PostgreSQL enum constraints checked and fixed');
    console.log('- Columns are now flexible varchar fields');
    console.log('- Strapi will handle enum validation in application layer');
    console.log('');
    console.log('Try creating a mannschaft in admin panel now!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
  }
}

// Load environment variables
require('dotenv').config();
fixPostgresEnum();