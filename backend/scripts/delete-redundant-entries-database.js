#!/usr/bin/env node

/**
 * Direct database deletion of redundant entries
 * This bypasses Strapi and works directly with PostgreSQL
 */

const { Client } = require('pg');

async function main() {
  console.log('🗑️  Direct database deletion of redundant entries...\n');

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

    // Step 1: Show current state
    await showCurrentState(client);

    // Step 2: Delete the redundant entries
    await deleteRedundantEntries(client);

    // Step 3: Verify deletion
    await verifyDeletion(client);

    console.log('\n✅ Database deletion completed!');

  } catch (error) {
    console.error('❌ Error during database deletion:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

async function showCurrentState(client) {
  console.log('📊 Current state in database:\n');

  const result = await client.query(`
    SELECT 
      te.id,
      te.team_name,
      te.platz,
      te.punkte,
      l.name as liga_name
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    WHERE te.team_name IN ('1. Mannschaft', '2. Mannschaft', '3. Mannschaft')
    ORDER BY te.id
  `);

  if (result.rows.length === 0) {
    console.log('✅ No redundant entries found in database');
    return;
  }

  console.log(`❌ Found ${result.rows.length} redundant entries in database:`);
  result.rows.forEach(row => {
    console.log(`  - ID ${row.id}: "${row.team_name}" in ${row.liga_name} (Position: ${row.platz})`);
  });
  console.log('');
}

async function deleteRedundantEntries(client) {
  console.log('🗑️  Deleting redundant entries from database...\n');

  // First, get the IDs of entries to delete
  const entriesToDelete = await client.query(`
    SELECT id, team_name
    FROM tabellen_eintraege 
    WHERE team_name IN ('1. Mannschaft', '2. Mannschaft', '3. Mannschaft')
  `);

  if (entriesToDelete.rows.length === 0) {
    console.log('✅ No entries to delete');
    return;
  }

  const idsToDelete = entriesToDelete.rows.map(row => row.id);
  console.log(`Found ${idsToDelete.length} entries to delete: ${idsToDelete.join(', ')}`);

  // Delete from link tables first (foreign key constraints)
  console.log('\n1. Deleting from link tables...');
  
  const linkDeleteResult1 = await client.query(`
    DELETE FROM tabellen_eintraege_liga_lnk 
    WHERE tabellen_eintrag_id = ANY($1)
  `, [idsToDelete]);
  console.log(`   Deleted ${linkDeleteResult1.rowCount} liga links`);

  const linkDeleteResult2 = await client.query(`
    DELETE FROM tabellen_eintraege_team_lnk 
    WHERE tabellen_eintrag_id = ANY($1)
  `, [idsToDelete]);
  console.log(`   Deleted ${linkDeleteResult2.rowCount} team links`);

  // Delete the main entries
  console.log('\n2. Deleting main entries...');
  const mainDeleteResult = await client.query(`
    DELETE FROM tabellen_eintraege 
    WHERE id = ANY($1)
  `, [idsToDelete]);
  console.log(`   Deleted ${mainDeleteResult.rowCount} main entries`);

  console.log(`\n✅ Successfully deleted ${mainDeleteResult.rowCount} redundant entries`);
}

async function verifyDeletion(client) {
  console.log('\n🔍 Verifying deletion...\n');

  // Check if redundant entries are gone
  const remainingRedundant = await client.query(`
    SELECT id, team_name
    FROM tabellen_eintraege 
    WHERE team_name IN ('1. Mannschaft', '2. Mannschaft', '3. Mannschaft')
  `);

  if (remainingRedundant.rows.length > 0) {
    console.error('❌ Still found redundant entries:');
    remainingRedundant.rows.forEach(row => {
      console.error(`  - ID ${row.id}: "${row.team_name}"`);
    });
  } else {
    console.log('✅ All redundant entries successfully deleted');
  }

  // Show final counts
  console.log('\n📊 Final counts by Liga:');
  
  const finalCounts = await client.query(`
    SELECT 
      COALESCE(l.name, 'NO LIGA') as liga_name,
      COUNT(*) as team_count,
      ARRAY_AGG(te.team_name ORDER BY te.platz) as teams
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    GROUP BY l.name
    ORDER BY l.name
  `);

  finalCounts.rows.forEach(row => {
    console.log(`  - ${row.liga_name}: ${row.team_count} teams`);
    
    // Show Viktoria team
    const viktoriaTeam = row.teams.find(name => 
      name && (name.toLowerCase().includes('viktoria') || name.toLowerCase().includes('vikt.'))
    );
    if (viktoriaTeam) {
      console.log(`    🟡 Viktoria: "${viktoriaTeam}"`);
    }
  });

  // Show total count
  const totalCount = await client.query('SELECT COUNT(*) as count FROM tabellen_eintraege');
  console.log(`\n📈 Total entries in database: ${totalCount.rows[0].count}`);
}

// Run the deletion
main().catch(console.error);