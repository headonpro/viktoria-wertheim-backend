#!/usr/bin/env node

/**
 * Fix duplicate positions in Kreisklasse B Tauberbischofsheim
 * All teams currently have position 1, need to assign proper positions 1-9
 */

const { Client } = require('pg');

async function main() {
  console.log('🔧 Fixing Kreisklasse B position duplicates...\n');

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

    // Step 1: Show current problem
    await showCurrentProblem(client);

    // Step 2: Fix the positions
    await fixPositions(client);

    // Step 3: Verify fix
    await verifyFix(client);

    console.log('\n✅ Position fix completed!');

  } catch (error) {
    console.error('❌ Error during fix:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

async function showCurrentProblem(client) {
  console.log('📊 Current Kreisklasse B positions:\n');

  const result = await client.query(`
    SELECT 
      te.id,
      te.team_name,
      te.platz,
      te.punkte
    FROM tabellen_eintraege te
    JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    JOIN ligas l ON tell.liga_id = l.id
    WHERE l.name = 'Kreisklasse B Tauberbischofsheim'
    ORDER BY te.id
  `);

  console.log(`Found ${result.rows.length} teams, all with position 1:`);
  result.rows.forEach((row, index) => {
    console.log(`  ${index + 1}. ID ${row.id}: "${row.team_name}" (Position: ${row.platz}, Points: ${row.punkte})`);
  });
}

async function fixPositions(client) {
  console.log('\n🔧 Assigning proper positions...\n');

  // Get all teams in Kreisklasse B, ordered by ID (which seems to be the current order)
  const teams = await client.query(`
    SELECT 
      te.id,
      te.team_name
    FROM tabellen_eintraege te
    JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    JOIN ligas l ON tell.liga_id = l.id
    WHERE l.name = 'Kreisklasse B Tauberbischofsheim'
    ORDER BY te.id
  `);

  console.log('Assigning positions 1-9:');
  
  for (let i = 0; i < teams.rows.length; i++) {
    const team = teams.rows[i];
    const newPosition = i + 1;
    
    await client.query(`
      UPDATE tabellen_eintraege 
      SET platz = $1 
      WHERE id = $2
    `, [newPosition, team.id]);
    
    console.log(`  ✅ ${team.team_name} → Position ${newPosition}`);
  }

  console.log(`\n📊 Updated ${teams.rows.length} team positions`);
}

async function verifyFix(client) {
  console.log('\n🔍 Verifying fix...\n');

  const result = await client.query(`
    SELECT 
      te.id,
      te.team_name,
      te.platz
    FROM tabellen_eintraege te
    JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    JOIN ligas l ON tell.liga_id = l.id
    WHERE l.name = 'Kreisklasse B Tauberbischofsheim'
    ORDER BY te.platz
  `);

  console.log('✅ Fixed Kreisklasse B positions:');
  result.rows.forEach(row => {
    console.log(`  ${row.platz}. ${row.team_name} (ID: ${row.id})`);
  });

  // Check for duplicates
  const duplicateCheck = await client.query(`
    SELECT platz, COUNT(*) as count
    FROM tabellen_eintraege te
    JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    JOIN ligas l ON tell.liga_id = l.id
    WHERE l.name = 'Kreisklasse B Tauberbischofsheim'
    GROUP BY platz
    HAVING COUNT(*) > 1
  `);

  if (duplicateCheck.rows.length > 0) {
    console.error('❌ Still found duplicate positions:');
    duplicateCheck.rows.forEach(row => {
      console.error(`  Position ${row.platz}: ${row.count} teams`);
    });
  } else {
    console.log('\n✅ No more duplicate positions!');
  }

  // Check position sequence
  const expectedPositions = Array.from({length: result.rows.length}, (_, i) => i + 1);
  const actualPositions = result.rows.map(row => row.platz).sort((a, b) => a - b);
  
  const sequenceOK = JSON.stringify(expectedPositions) === JSON.stringify(actualPositions);
  
  if (sequenceOK) {
    console.log('✅ Position sequence is correct (1, 2, 3, ..., 9)');
  } else {
    console.error('❌ Position sequence is incorrect');
    console.error(`  Expected: ${expectedPositions.join(', ')}`);
    console.error(`  Actual: ${actualPositions.join(', ')}`);
  }
}

// Run the fix
main().catch(console.error);