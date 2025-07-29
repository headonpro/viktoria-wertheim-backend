#!/usr/bin/env node

/**
 * Script to add club relations to existing tabellen-eintrag records
 * This should be run after the schema has been updated and clubs are populated
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

async function addClubRelations() {
  console.log('🏢 Adding club relations to tabellen-eintrag records...\n');
  
  try {
    // Step 1: Check if club link table exists
    console.log('🔍 Checking database structure...');
    
    const clubLinkExists = await queryDatabase(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tabellen_eintraege_club_lnk'
      );
    `);
    
    if (!clubLinkExists[0].exists) {
      console.log('❌ Club link table does not exist. Please restart Strapi to apply schema changes.');
      process.exit(1);
    }
    
    console.log('✅ Club link table exists');
    
    // Step 2: Check if clubs are populated
    const clubCount = await queryDatabase('SELECT COUNT(*) as count FROM clubs');
    console.log(`   Found ${clubCount[0].count} clubs in database`);
    
    if (clubCount[0].count === 0) {
      console.log('❌ No clubs found. Please populate clubs first.');
      process.exit(1);
    }
    
    // Step 3: Get entries that need club relations
    console.log('\n🔍 Finding entries that need club relations...');
    
    const entriesNeedingClubRelations = await queryDatabase(`
      SELECT DISTINCT te.id, te.team_name, tl.team_id, t.name as team_real_name
      FROM tabellen_eintraege te
      JOIN tabellen_eintraege_team_lnk tl ON te.id = tl.tabellen_eintrag_id
      JOIN teams t ON tl.team_id = t.id
      WHERE NOT EXISTS (
        SELECT 1 FROM tabellen_eintraege_club_lnk cl WHERE cl.tabellen_eintrag_id = te.id
      )
      ORDER BY te.id
    `);
    
    console.log(`   Found ${entriesNeedingClubRelations.length} entries needing club relations`);
    
    if (entriesNeedingClubRelations.length === 0) {
      console.log('✅ All entries already have club relations');
      return;
    }
    
    // Step 4: Get available clubs
    console.log('\n🏢 Getting available clubs...');
    
    const clubs = await queryDatabase(`
      SELECT c.id, c.name, c.club_typ, c.viktoria_team_mapping
      FROM clubs c
      WHERE c.aktiv = true
      ORDER BY c.name
    `);
    
    console.log(`   Available clubs:`);
    clubs.forEach(club => {
      console.log(`     ${club.id}: ${club.name} (${club.club_typ}${club.viktoria_team_mapping ? `, ${club.viktoria_team_mapping}` : ''})`);
    });
    
    // Step 5: Add club relations
    console.log('\n🔗 Adding club relations...');
    
    let added = 0;
    let errors = 0;
    
    for (const entry of entriesNeedingClubRelations) {
      try {
        // Find matching club
        let matchingClub = null;
        
        // Try direct team name mapping first
        const expectedClubName = TEAM_TO_CLUB_MAPPING[entry.team_real_name];
        if (expectedClubName) {
          matchingClub = clubs.find(club => club.name === expectedClubName);
        }
        
        // Try team mapping approach
        if (!matchingClub && entry.team_real_name) {
          const teamMapping = {
            '1. Mannschaft': 'team_1',
            '2. Mannschaft': 'team_2',
            '3. Mannschaft': 'team_3'
          }[entry.team_real_name];
          
          if (teamMapping) {
            matchingClub = clubs.find(club => 
              club.club_typ === 'viktoria_verein' && 
              club.viktoria_team_mapping === teamMapping
            );
          }
        }
        
        // Try exact name match with team_name
        if (!matchingClub) {
          matchingClub = clubs.find(club => club.name === entry.team_name);
        }
        
        if (matchingClub) {
          // Add club relation
          await queryDatabase(`
            INSERT INTO tabellen_eintraege_club_lnk (tabellen_eintrag_id, club_id)
            VALUES ($1, $2)
          `, [entry.id, matchingClub.id]);
          
          // Update team_name to match club name if different
          if (entry.team_name !== matchingClub.name) {
            await queryDatabase(`
              UPDATE tabellen_eintraege 
              SET team_name = $1, updated_at = NOW()
              WHERE id = $2
            `, [matchingClub.name, entry.id]);
          }
          
          added++;
          console.log(`   ✅ Added club relation for entry ${entry.id}: ${matchingClub.name} (Club ID: ${matchingClub.id})`);
        } else {
          console.log(`   ⚠️  No matching club found for entry ${entry.id}: "${entry.team_name}" (Team: ${entry.team_real_name})`);
        }
      } catch (error) {
        errors++;
        console.log(`   ❌ Failed to add club relation for entry ${entry.id}: ${error.message}`);
      }
    }
    
    // Step 6: Verify results
    console.log('\n🔍 Verifying results...');
    
    const finalClubRelations = await queryDatabase('SELECT COUNT(*) as count FROM tabellen_eintraege_club_lnk');
    console.log(`   Total club relations: ${finalClubRelations[0].count}`);
    
    const entriesWithClubRelations = await queryDatabase(`
      SELECT te.id, te.team_name, c.name as club_name
      FROM tabellen_eintraege te
      JOIN tabellen_eintraege_club_lnk cl ON te.id = cl.tabellen_eintrag_id
      JOIN clubs c ON cl.club_id = c.id
      ORDER BY te.id
    `);
    
    console.log('   Entries with club relations:');
    entriesWithClubRelations.forEach(entry => {
      const isConsistent = entry.team_name === entry.club_name;
      console.log(`     Entry ${entry.id}: "${entry.team_name}" -> Club: "${entry.club_name}" ${isConsistent ? '✅' : '⚠️'}`);
    });
    
    // Step 7: Summary
    console.log('\n📊 Club Relations Summary:');
    console.log('='.repeat(50));
    console.log(`Entries processed: ${entriesNeedingClubRelations.length}`);
    console.log(`Club relations added: ${added}`);
    console.log(`Errors: ${errors}`);
    console.log(`Success rate: ${entriesNeedingClubRelations.length > 0 ? ((added / entriesNeedingClubRelations.length) * 100).toFixed(1) : 100}%`);
    
    const success = errors === 0;
    console.log(`\n${success ? '✅' : '❌'} Club relations ${success ? 'added successfully' : 'completed with errors'}`);
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Adding club relations failed:', error);
    process.exit(1);
  }
}

addClubRelations();