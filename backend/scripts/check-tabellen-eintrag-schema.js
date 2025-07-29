#!/usr/bin/env node

/**
 * Script to check the current tabellen-eintrag schema
 */

// Simple database query function
async function queryDatabase(query, params = []) {
  const { Client } = require('pg');
  
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME || 'viktoria_wertheim',
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres'
  });

  try {
    await client.connect();
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function checkSchema() {
  console.log('🔍 Checking tabellen-eintrag schema...\n');
  
  try {
    // Check if table exists
    const tableExists = await queryDatabase(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tabellen_eintraege'
      );
    `);
    
    if (!tableExists[0].exists) {
      console.log('❌ Table tabellen_eintraege does not exist');
      return;
    }
    
    console.log('✅ Table tabellen_eintraege exists');
    
    // Get table columns
    const columns = await queryDatabase(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'tabellen_eintraege'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Current columns:');
    columns.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // Check for club_id column specifically
    const hasClubId = columns.some(col => col.column_name === 'club_id');
    console.log(`\n🏢 Has club_id column: ${hasClubId ? 'Yes' : 'No'}`);
    
    // Check for team_id column
    const hasTeamId = columns.some(col => col.column_name === 'team_id');
    console.log(`👥 Has team_id column: ${hasTeamId ? 'Yes' : 'No'}`);
    
    // Get sample data
    const sampleData = await queryDatabase(`
      SELECT * FROM tabellen_eintraege 
      ORDER BY id 
      LIMIT 5
    `);
    
    console.log(`\n📊 Sample data (${sampleData.length} rows):`);
    sampleData.forEach(row => {
      console.log(`   ID ${row.id}: "${row.team_name}" (Liga: ${row.liga_id})`);
    });
    
    // Get total count
    const totalCount = await queryDatabase('SELECT COUNT(*) as count FROM tabellen_eintraege');
    console.log(`\n📈 Total entries: ${totalCount[0].count}`);
    
    // Check related tables
    console.log('\n🔗 Checking related tables...');
    
    const clubsExist = await queryDatabase(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clubs'
      );
    `);
    
    console.log(`   Clubs table exists: ${clubsExist[0].exists ? 'Yes' : 'No'}`);
    
    if (clubsExist[0].exists) {
      const clubCount = await queryDatabase('SELECT COUNT(*) as count FROM clubs');
      console.log(`   Total clubs: ${clubCount[0].count}`);
    }
    
    const teamsExist = await queryDatabase(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'teams'
      );
    `);
    
    console.log(`   Teams table exists: ${teamsExist[0].exists ? 'Yes' : 'No'}`);
    
    if (teamsExist[0].exists) {
      const teamCount = await queryDatabase('SELECT COUNT(*) as count FROM teams');
      console.log(`   Total teams: ${teamCount[0].count}`);
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    process.exit(1);
  }
}

checkSchema();