#!/usr/bin/env node

/**
 * Cleanup duplicate Tabellen-Einträge
 * This script removes duplicate entries and ensures data integrity
 */

const { Client } = require('pg');

async function main() {
  console.log('🧹 Starting cleanup of duplicate Tabellen-Einträge...\n');

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

    // Step 1: Analyze duplicates
    console.log('\n📊 Analyzing duplicate entries...');
    await analyzeDuplicates(client);

    // Step 2: Remove duplicates
    console.log('\n🗑️ Removing duplicate entries...');
    await removeDuplicates(client);

    // Step 3: Verify cleanup
    console.log('\n✅ Verifying cleanup...');
    await verifyCleanup(client);

    console.log('\n🎉 Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

async function analyzeDuplicates(client) {
  // Find duplicate Tabellen-Einträge by team_name and liga
  const duplicatesResult = await client.query(`
    SELECT 
      te.team_name,
      l.name as liga_name,
      COUNT(*) as count,
      ARRAY_AGG(te.id ORDER BY te.id) as ids
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    GROUP BY te.team_name, l.name
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, te.team_name
  `);

  console.log(`Found ${duplicatesResult.rows.length} teams with duplicates:`);
  duplicatesResult.rows.forEach(row => {
    console.log(`  - ${row.team_name} in ${row.liga_name}: ${row.count} entries (IDs: ${row.ids.join(', ')})`);
  });

  return duplicatesResult.rows;
}

async function removeDuplicates(client) {
  let hasMoreDuplicates = true;
  let iteration = 0;
  
  while (hasMoreDuplicates && iteration < 10) { // Safety limit
    iteration++;
    console.log(`\n--- Iteration ${iteration} ---`);
    
    // Get all duplicates
    const duplicatesResult = await client.query(`
      SELECT 
        te.team_name,
        l.name as liga_name,
        l.id as liga_id,
        ARRAY_AGG(te.id ORDER BY te.id) as ids
      FROM tabellen_eintraege te
      LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
      LEFT JOIN ligas l ON tell.liga_id = l.id
      GROUP BY te.team_name, l.name, l.id
      HAVING COUNT(*) > 1
      ORDER BY te.team_name
    `);

    if (duplicatesResult.rows.length === 0) {
      hasMoreDuplicates = false;
      console.log('No more duplicates found');
      break;
    }

    console.log(`Found ${duplicatesResult.rows.length} teams with duplicates`);

    for (const duplicate of duplicatesResult.rows) {
      const idsToKeep = duplicate.ids.slice(0, 1); // Keep first entry
      const idsToDelete = duplicate.ids.slice(1); // Delete the rest

      console.log(`Cleaning up ${duplicate.team_name} in ${duplicate.liga_name}:`);
      console.log(`  - Keeping ID: ${idsToKeep[0]}`);
      console.log(`  - Deleting IDs: ${idsToDelete.join(', ')}`);

      // Delete link table entries first
      if (idsToDelete.length > 0) {
        await client.query(`DELETE FROM tabellen_eintraege_liga_lnk WHERE tabellen_eintrag_id = ANY($1)`, [idsToDelete]);
        await client.query(`DELETE FROM tabellen_eintraege_team_lnk WHERE tabellen_eintrag_id = ANY($1)`, [idsToDelete]);
        
        // Delete the duplicate entries
        await client.query(`DELETE FROM tabellen_eintraege WHERE id = ANY($1)`, [idsToDelete]);
        
        console.log(`  ✅ Removed ${idsToDelete.length} duplicate entries`);
      }
    }
  }
  
  if (iteration >= 10) {
    console.warn('⚠️  Reached maximum iterations, some duplicates might remain');
  }
}

async function verifyCleanup(client) {
  // Check for remaining duplicates
  const remainingDuplicatesResult = await client.query(`
    SELECT 
      te.team_name,
      l.name as liga_name,
      COUNT(*) as count
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    GROUP BY te.team_name, l.name
    HAVING COUNT(*) > 1
  `);

  if (remainingDuplicatesResult.rows.length > 0) {
    console.error('❌ Still found duplicates after cleanup:');
    remainingDuplicatesResult.rows.forEach(row => {
      console.error(`  - ${row.team_name} in ${row.liga_name}: ${row.count} entries`);
    });
    throw new Error('Cleanup failed - duplicates still exist');
  }

  // Show final summary
  const finalSummaryResult = await client.query(`
    SELECT 
      l.name as liga_name,
      COUNT(*) as team_count
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    GROUP BY l.name
    ORDER BY l.name
  `);

  console.log('\n📊 Final summary:');
  finalSummaryResult.rows.forEach(row => {
    console.log(`  - ${row.liga_name}: ${row.team_count} teams`);
  });

  // Show Viktoria teams specifically
  const viktoriaTeamsResult = await client.query(`
    SELECT 
      te.team_name,
      te.platz,
      l.name as liga_name
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    WHERE te.team_name ILIKE '%viktoria%'
    ORDER BY l.name, te.platz
  `);

  console.log('\n🟡 Viktoria teams in Tabellen-Einträge:');
  viktoriaTeamsResult.rows.forEach(row => {
    console.log(`  - ${row.team_name} (Platz ${row.platz}) in ${row.liga_name}`);
  });

  console.log('\n✅ Cleanup verification completed successfully!');
}

// Run the cleanup
main().catch(console.error);