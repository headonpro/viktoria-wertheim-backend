#!/usr/bin/env node

/**
 * Simple script to update team_name fields to use proper club names
 * This works with the current database structure
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

// Team name to club name mapping
const TEAM_TO_CLUB_MAPPING = {
  '1. Mannschaft': 'SV Viktoria Wertheim',
  '2. Mannschaft': 'SV Viktoria Wertheim II', 
  '3. Mannschaft': 'SpG Vikt. Wertheim 3/Grünenwort'
};

async function updateTeamNames() {
  console.log('📝 Updating team names to use proper club names...\n');
  
  try {
    // Step 1: Get current entries with team relations
    console.log('🔍 Finding entries with team relations...');
    
    const entriesWithTeams = await queryDatabase(`
      SELECT DISTINCT te.id, te.team_name, tl.team_id, t.name as team_real_name
      FROM tabellen_eintraege te
      JOIN tabellen_eintraege_team_lnk tl ON te.id = tl.tabellen_eintrag_id
      JOIN teams t ON tl.team_id = t.id
      ORDER BY te.id
    `);
    
    console.log(`   Found ${entriesWithTeams.length} entries with team relations`);
    
    if (entriesWithTeams.length === 0) {
      console.log('✅ No entries with team relations found');
      return;
    }
    
    // Show current entries
    console.log('   Current entries:');
    entriesWithTeams.forEach(entry => {
      console.log(`     Entry ${entry.id}: "${entry.team_name}" (Team: ${entry.team_real_name})`);
    });
    
    // Step 2: Update team names to use club names
    console.log('\n🔄 Updating team names...');
    
    let updated = 0;
    let skipped = 0;
    
    for (const entry of entriesWithTeams) {
      try {
        // Get the proper club name for this team
        const clubName = TEAM_TO_CLUB_MAPPING[entry.team_real_name];
        
        if (clubName && entry.team_name !== clubName) {
          // Update the team_name to use the club name
          await queryDatabase(`
            UPDATE tabellen_eintraege 
            SET team_name = $1, updated_at = NOW()
            WHERE id = $2
          `, [clubName, entry.id]);
          
          updated++;
          console.log(`   ✅ Updated entry ${entry.id}: "${entry.team_name}" -> "${clubName}"`);
        } else if (clubName && entry.team_name === clubName) {
          skipped++;
          console.log(`   ⏭️  Entry ${entry.id} already has correct name: "${clubName}"`);
        } else {
          console.log(`   ⚠️  No mapping found for team "${entry.team_real_name}" in entry ${entry.id}`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to update entry ${entry.id}: ${error.message}`);
      }
    }
    
    // Step 3: Verify results
    console.log('\n🔍 Verifying results...');
    
    const updatedEntries = await queryDatabase(`
      SELECT DISTINCT te.id, te.team_name, t.name as team_real_name
      FROM tabellen_eintraege te
      JOIN tabellen_eintraege_team_lnk tl ON te.id = tl.tabellen_eintrag_id
      JOIN teams t ON tl.team_id = t.id
      ORDER BY te.id
    `);
    
    console.log('   Final state:');
    updatedEntries.forEach(entry => {
      const expectedClubName = TEAM_TO_CLUB_MAPPING[entry.team_real_name];
      const isCorrect = expectedClubName && entry.team_name === expectedClubName;
      console.log(`     Entry ${entry.id}: "${entry.team_name}" ${isCorrect ? '✅' : '⚠️'}`);
    });
    
    // Step 4: Summary
    console.log('\n📊 Update Summary:');
    console.log('='.repeat(50));
    console.log(`Entries processed: ${entriesWithTeams.length}`);
    console.log(`Entries updated: ${updated}`);
    console.log(`Entries skipped (already correct): ${skipped}`);
    console.log(`Success rate: ${entriesWithTeams.length > 0 ? (((updated + skipped) / entriesWithTeams.length) * 100).toFixed(1) : 100}%`);
    
    console.log('\n✅ Team name update completed successfully');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

updateTeamNames();