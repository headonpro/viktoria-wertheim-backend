#!/usr/bin/env node

/**
 * Simple script to run tabellen-eintrag migration
 * This bypasses the complex Strapi loading issues
 */

const path = require('path');
const fs = require('fs');

// Simple database query function
async function queryDatabase(query, params = []) {
  const { Client } = require('pg');
  
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME || 'viktoria_wertheim',
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password'
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

async function runMigration() {
  console.log('🚀 Starting Tabellen-Eintrag migration...\n');
  
  try {
    // Step 1: Get current statistics
    console.log('📊 Getting current statistics...');
    
    const totalEntries = await queryDatabase('SELECT COUNT(*) as count FROM tabellen_eintraege');
    
    // Check for club link table
    const clubLinkExists = await queryDatabase(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tabellen_eintraege_club_lnk'
      );
    `);
    
    let entriesWithClubs = [{ count: 0 }];
    if (clubLinkExists[0].exists) {
      entriesWithClubs = await queryDatabase('SELECT COUNT(*) as count FROM tabellen_eintraege_club_lnk');
    }
    
    const entriesWithTeams = await queryDatabase('SELECT COUNT(*) as count FROM tabellen_eintraege_team_lnk');
    
    console.log(`   Total entries: ${totalEntries[0].count}`);
    console.log(`   Entries with clubs: ${entriesWithClubs[0].count}`);
    console.log(`   Entries with teams: ${entriesWithTeams[0].count}`);
    console.log(`   Entries without clubs: ${totalEntries[0].count - entriesWithClubs[0].count}`);
    
    // Step 2: Get entries that need migration
    console.log('\n🔍 Finding entries that need migration...');
    
    const entriesNeedingMigration = await queryDatabase(`
      SELECT DISTINCT te.id, te.team_name, tl.team_id, t.name as team_real_name, ll.liga_id, l.name as liga_name
      FROM tabellen_eintraege te
      LEFT JOIN tabellen_eintraege_team_lnk tl ON te.id = tl.tabellen_eintrag_id
      LEFT JOIN teams t ON tl.team_id = t.id
      LEFT JOIN tabellen_eintraege_liga_lnk ll ON te.id = ll.tabellen_eintrag_id
      LEFT JOIN ligen l ON ll.liga_id = l.id
      WHERE tl.team_id IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM tabellen_eintraege_club_lnk cl WHERE cl.tabellen_eintrag_id = te.id
      )
      ORDER BY te.id
    `);
    
    console.log(`   Found ${entriesNeedingMigration.length} entries needing migration`);
    
    if (entriesNeedingMigration.length === 0) {
      console.log('✅ No entries need migration');
      return;
    }
    
    // Show first few entries
    console.log('   Sample entries:');
    entriesNeedingMigration.slice(0, 5).forEach(entry => {
      console.log(`     Entry ${entry.id}: "${entry.team_name}" (Team: ${entry.team_real_name}, Liga: ${entry.liga_name})`);
    });
    
    // Step 3: Get available clubs
    console.log('\n🏢 Getting available clubs...');
    
    const clubs = await queryDatabase(`
      SELECT c.id, c.name, c.club_typ, c.viktoria_team_mapping
      FROM clubs c
      WHERE c.aktiv = true
      ORDER BY c.name
    `);
    
    console.log(`   Found ${clubs.length} active clubs`);
    
    // Step 4: Perform migration
    console.log('\n🔄 Performing migration...');
    
    let updated = 0;
    let errors = 0;
    
    for (const entry of entriesNeedingMigration) {
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
        
        // Try exact name match
        if (!matchingClub) {
          matchingClub = clubs.find(club => club.name === entry.team_name);
        }
        
        if (matchingClub) {
          // Update entry with club relation and correct team_name
          await queryDatabase(`
            UPDATE tabellen_eintraege 
            SET club_id = $1, team_name = $2, updated_at = NOW()
            WHERE id = $3
          `, [matchingClub.id, matchingClub.name, entry.id]);
          
          updated++;
          console.log(`   ✅ Updated entry ${entry.id}: "${entry.team_name}" -> "${matchingClub.name}" (Club ID: ${matchingClub.id})`);
        } else {
          console.log(`   ⚠️  No matching club found for entry ${entry.id}: "${entry.team_name}" (Team: ${entry.team_real_name})`);
        }
      } catch (error) {
        errors++;
        console.log(`   ❌ Failed to update entry ${entry.id}: ${error.message}`);
      }
    }
    
    // Step 5: Validate results
    console.log('\n🔍 Validating migration results...');
    
    const finalStats = await queryDatabase('SELECT COUNT(*) as count FROM tabellen_eintraege WHERE club_id IS NOT NULL');
    const inconsistentEntries = await queryDatabase(`
      SELECT te.id, te.team_name, c.name as club_name
      FROM tabellen_eintraege te
      JOIN clubs c ON te.club_id = c.id
      WHERE te.team_name != c.name
    `);
    
    console.log(`   Entries with clubs after migration: ${finalStats[0].count}`);
    console.log(`   Inconsistent entries: ${inconsistentEntries.length}`);
    
    if (inconsistentEntries.length > 0) {
      console.log('   Inconsistencies found:');
      inconsistentEntries.slice(0, 5).forEach(entry => {
        console.log(`     Entry ${entry.id}: "${entry.team_name}" ≠ "${entry.club_name}"`);
      });
    }
    
    // Step 6: Summary
    console.log('\n📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`Entries processed: ${entriesNeedingMigration.length}`);
    console.log(`Entries updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Success rate: ${entriesNeedingMigration.length > 0 ? ((updated / entriesNeedingMigration.length) * 100).toFixed(1) : 100}%`);
    
    const success = errors === 0;
    console.log(`\n${success ? '✅' : '❌'} Migration ${success ? 'completed successfully' : 'completed with errors'}`);
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();