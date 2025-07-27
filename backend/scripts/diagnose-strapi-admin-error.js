#!/usr/bin/env node

/**
 * Diagnose Strapi Admin Panel errors after database cleanup
 * This script checks for data integrity issues that might cause admin errors
 */

const { Client } = require('pg');

async function main() {
  console.log('🔍 Diagnosing Strapi Admin Panel errors...\n');

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

    // Step 1: Check for orphaned references
    await checkOrphanedReferences(client);

    // Step 2: Check for missing required fields
    await checkMissingRequiredFields(client);

    // Step 3: Check for data consistency issues
    await checkDataConsistency(client);

    // Step 4: Check for ID sequence issues
    await checkIdSequences(client);

    // Step 5: Suggest fixes
    await suggestFixes(client);

    console.log('\n✅ Diagnosis completed!');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

async function checkOrphanedReferences(client) {
  console.log('\n🔍 Checking for orphaned references...\n');

  // Check for orphaned liga links
  const orphanedLigaLinks = await client.query(`
    SELECT tell.*, te.team_name
    FROM tabellen_eintraege_liga_lnk tell
    LEFT JOIN tabellen_eintraege te ON tell.tabellen_eintrag_id = te.id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    WHERE te.id IS NULL OR l.id IS NULL
  `);

  if (orphanedLigaLinks.rows.length > 0) {
    console.log('❌ Found orphaned liga links:');
    orphanedLigaLinks.rows.forEach(row => {
      console.log(`  - Link ID: ${row.id}, Tabellen-Eintrag: ${row.tabellen_eintrag_id}, Liga: ${row.liga_id}`);
    });
  } else {
    console.log('✅ No orphaned liga links found');
  }

  // Check for orphaned team links
  const orphanedTeamLinks = await client.query(`
    SELECT tetl.*, te.team_name
    FROM tabellen_eintraege_team_lnk tetl
    LEFT JOIN tabellen_eintraege te ON tetl.tabellen_eintrag_id = te.id
    LEFT JOIN teams t ON tetl.team_id = t.id
    WHERE te.id IS NULL OR t.id IS NULL
  `);

  if (orphanedTeamLinks.rows.length > 0) {
    console.log('❌ Found orphaned team links:');
    orphanedTeamLinks.rows.forEach(row => {
      console.log(`  - Link ID: ${row.id}, Tabellen-Eintrag: ${row.tabellen_eintrag_id}, Team: ${row.team_id}`);
    });
  } else {
    console.log('✅ No orphaned team links found');
  }
}

async function checkMissingRequiredFields(client) {
  console.log('\n🔍 Checking for missing required fields...\n');

  // Check for entries without liga
  const entriesWithoutLiga = await client.query(`
    SELECT te.id, te.team_name
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    WHERE tell.liga_id IS NULL
  `);

  if (entriesWithoutLiga.rows.length > 0) {
    console.log('❌ Found entries without liga:');
    entriesWithoutLiga.rows.forEach(row => {
      console.log(`  - ID ${row.id}: "${row.team_name}"`);
    });
  } else {
    console.log('✅ All entries have liga assigned');
  }

  // Check for entries with missing team_name
  const entriesWithoutName = await client.query(`
    SELECT id, team_name
    FROM tabellen_eintraege
    WHERE team_name IS NULL OR team_name = ''
  `);

  if (entriesWithoutName.rows.length > 0) {
    console.log('❌ Found entries without team name:');
    entriesWithoutName.rows.forEach(row => {
      console.log(`  - ID ${row.id}: "${row.team_name}"`);
    });
  } else {
    console.log('✅ All entries have team names');
  }

  // Check for entries with missing platz
  const entriesWithoutPlatz = await client.query(`
    SELECT id, team_name, platz
    FROM tabellen_eintraege
    WHERE platz IS NULL OR platz < 1
  `);

  if (entriesWithoutPlatz.rows.length > 0) {
    console.log('❌ Found entries without valid position:');
    entriesWithoutPlatz.rows.forEach(row => {
      console.log(`  - ID ${row.id}: "${row.team_name}" (Position: ${row.platz})`);
    });
  } else {
    console.log('✅ All entries have valid positions');
  }
}

async function checkDataConsistency(client) {
  console.log('\n🔍 Checking for data consistency issues...\n');

  // Check for duplicate positions within same liga
  const duplicatePositions = await client.query(`
    SELECT 
      l.name as liga_name,
      te.platz,
      COUNT(*) as count,
      ARRAY_AGG(te.team_name) as teams
    FROM tabellen_eintraege te
    JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    JOIN ligas l ON tell.liga_id = l.id
    GROUP BY l.name, te.platz
    HAVING COUNT(*) > 1
    ORDER BY l.name, te.platz
  `);

  if (duplicatePositions.rows.length > 0) {
    console.log('❌ Found duplicate positions:');
    duplicatePositions.rows.forEach(row => {
      console.log(`  - ${row.liga_name}, Position ${row.platz}: ${row.teams.join(', ')}`);
    });
  } else {
    console.log('✅ No duplicate positions found');
  }

  // Check for gaps in positions
  const positionGaps = await client.query(`
    WITH liga_positions AS (
      SELECT 
        l.id as liga_id,
        l.name as liga_name,
        te.platz,
        ROW_NUMBER() OVER (PARTITION BY l.id ORDER BY te.platz) as expected_position
      FROM tabellen_eintraege te
      JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
      JOIN ligas l ON tell.liga_id = l.id
      ORDER BY l.id, te.platz
    )
    SELECT liga_name, platz, expected_position
    FROM liga_positions
    WHERE platz != expected_position
  `);

  if (positionGaps.rows.length > 0) {
    console.log('❌ Found position gaps:');
    positionGaps.rows.forEach(row => {
      console.log(`  - ${row.liga_name}: Position ${row.platz} should be ${row.expected_position}`);
    });
  } else {
    console.log('✅ No position gaps found');
  }
}

async function checkIdSequences(client) {
  console.log('\n🔍 Checking ID sequences...\n');

  // Check tabellen_eintraege sequence
  const tabellenSequence = await client.query(`
    SELECT 
      last_value,
      (SELECT MAX(id) FROM tabellen_eintraege) as max_id
    FROM tabellen_eintraege_id_seq
  `);

  const seqValue = tabellenSequence.rows[0].last_value;
  const maxId = tabellenSequence.rows[0].max_id;

  if (seqValue < maxId) {
    console.log(`❌ Sequence issue: last_value (${seqValue}) < max_id (${maxId})`);
  } else {
    console.log(`✅ Sequence OK: last_value (${seqValue}) >= max_id (${maxId})`);
  }
}

async function suggestFixes(client) {
  console.log('\n🔧 Suggested fixes:\n');

  // Get current state summary
  const summary = await client.query(`
    SELECT 
      l.name as liga_name,
      COUNT(*) as team_count,
      MIN(te.platz) as min_position,
      MAX(te.platz) as max_position
    FROM tabellen_eintraege te
    JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    JOIN ligas l ON tell.liga_id = l.id
    GROUP BY l.name
    ORDER BY l.name
  `);

  console.log('📊 Current state:');
  summary.rows.forEach(row => {
    console.log(`  - ${row.liga_name}: ${row.team_count} teams (positions ${row.min_position}-${row.max_position})`);
  });

  console.log('\n💡 Recommended actions:');
  console.log('1. Restart Strapi backend to clear cache');
  console.log('2. Clear browser cache and cookies for Strapi admin');
  console.log('3. If errors persist, run the fix script');
  console.log('4. Check Strapi logs for specific error details');
}

// Run the diagnosis
main().catch(console.error);