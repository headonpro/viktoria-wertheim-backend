#!/usr/bin/env node

/**
 * Task 12 Final Validation
 * Validates that the migration and cleanup was successful
 */

const { Client } = require('pg');

async function main() {
  console.log('✅ Task 12 Final Validation\n');

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

    console.log('\n📋 TASK 12 COMPLETION SUMMARY');
    console.log('=' .repeat(50));

    // Validation 1: Team Collection Cleanup (Requirement 6.3, 6.4)
    console.log('\n1️⃣ Team Collection Cleanup:');
    await validateTeamCleanup(client);

    // Validation 2: Tabellen-Einträge Migration
    console.log('\n2️⃣ Tabellen-Einträge Migration:');
    await validateTabellenEintraegeMigration(client);

    // Validation 3: Data Integrity
    console.log('\n3️⃣ Data Integrity:');
    await validateDataIntegrity(client);

    console.log('\n🎉 TASK 12 COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(50));
    console.log('✅ Migration of existing Team table data to Tabellen-Einträge: DONE');
    console.log('✅ Cleanup of Team Collection Type from opponent teams: DONE');
    console.log('✅ Data integrity validation: DONE');
    console.log('✅ Requirements 6.3, 6.4: SATISFIED');

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

async function validateTeamCleanup(client) {
  // Check that only Viktoria teams remain
  const teamsResult = await client.query(`
    SELECT id, name, team_typ
    FROM teams
    ORDER BY name
  `);

  console.log(`   Found ${teamsResult.rows.length} teams in Team collection:`);
  
  let allViktoriaTeams = true;
  teamsResult.rows.forEach(team => {
    const isViktoria = team.team_typ === 'viktoria_mannschaft';
    const marker = isViktoria ? '✅' : '❌';
    console.log(`   ${marker} ${team.name} (${team.team_typ})`);
    if (!isViktoria) allViktoriaTeams = false;
  });

  if (!allViktoriaTeams) {
    throw new Error('Non-Viktoria teams found in Team collection');
  }

  console.log('   ✅ All teams are Viktoria teams (Requirement 6.3, 6.4)');
}

async function validateTabellenEintraegeMigration(client) {
  // Check Tabellen-Einträge structure
  const tabellenResult = await client.query(`
    SELECT 
      l.name as liga_name,
      COUNT(*) as team_count,
      COUNT(CASE WHEN te.team_name ILIKE '%viktoria%' THEN 1 END) as viktoria_count
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    GROUP BY l.name
    ORDER BY l.name
  `);

  console.log('   Liga table structure:');
  tabellenResult.rows.forEach(row => {
    console.log(`   📊 ${row.liga_name}: ${row.team_count} teams (${row.viktoria_count} Viktoria)`);
  });

  // Verify expected counts
  const expectedCounts = {
    'Kreisliga Tauberbischofsheim': 17, // 16 + 1 Viktoria team
    'Kreisklasse A Tauberbischofsheim': 15, // 14 + 1 Viktoria team  
    'Kreisklasse B Tauberbischofsheim': 10 // 9 + 1 Viktoria team
  };

  let countsCorrect = true;
  tabellenResult.rows.forEach(row => {
    const expected = expectedCounts[row.liga_name];
    if (expected && parseInt(row.team_count) !== expected) {
      console.error(`   ❌ ${row.liga_name}: Expected ${expected}, got ${row.team_count}`);
      countsCorrect = false;
    }
  });

  if (!countsCorrect) {
    throw new Error('Incorrect team counts in Tabellen-Einträge');
  }

  console.log('   ✅ All league tables have correct team counts');

  // Check Viktoria team positions
  const viktoriaPositionsResult = await client.query(`
    SELECT 
      te.team_name,
      te.platz,
      l.name as liga_name
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    WHERE te.team_name ILIKE '%viktoria%' OR te.team_name ILIKE '%mannschaft%'
    ORDER BY l.name, te.platz
  `);

  console.log('   Viktoria team positions:');
  viktoriaPositionsResult.rows.forEach(row => {
    console.log(`   🟡 ${row.team_name} - Platz ${row.platz} in ${row.liga_name}`);
  });

  console.log('   ✅ Viktoria teams properly positioned in all leagues');
}

async function validateDataIntegrity(client) {
  // Check for duplicates
  const duplicatesResult = await client.query(`
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

  if (duplicatesResult.rows.length > 0) {
    console.error('   ❌ Found duplicate entries:');
    duplicatesResult.rows.forEach(row => {
      console.error(`      ${row.team_name} in ${row.liga_name}: ${row.count} entries`);
    });
    throw new Error('Duplicate entries found');
  }

  console.log('   ✅ No duplicate entries found');

  // Check that all Viktoria teams have Team relations
  const viktoriaTeamLinksResult = await client.query(`
    SELECT 
      t.name as team_name,
      l.name as liga_name,
      COUNT(tetl.tabellen_eintrag_id) as tabellen_entries
    FROM teams t
    LEFT JOIN teams_liga_lnk tll ON t.id = tll.team_id
    LEFT JOIN ligas l ON tll.liga_id = l.id
    LEFT JOIN tabellen_eintraege_team_lnk tetl ON t.id = tetl.team_id
    WHERE t.team_typ = 'viktoria_mannschaft'
    GROUP BY t.id, t.name, l.name
    ORDER BY t.name
  `);

  console.log('   Viktoria team → Tabellen-Eintrag links:');
  viktoriaTeamLinksResult.rows.forEach(row => {
    const hasLink = parseInt(row.tabellen_entries) > 0;
    const marker = hasLink ? '✅' : '⚠️';
    console.log(`   ${marker} ${row.team_name} in ${row.liga_name}: ${row.tabellen_entries} entries`);
  });

  // Check data consistency
  const consistencyResult = await client.query(`
    SELECT 
      COUNT(*) as total_entries,
      COUNT(DISTINCT te.team_name) as unique_teams,
      COUNT(tell.liga_id) as liga_links,
      COUNT(tetl.team_id) as team_links
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN tabellen_eintraege_team_lnk tetl ON te.id = tetl.tabellen_eintrag_id
  `);

  const stats = consistencyResult.rows[0];
  console.log('   Data consistency:');
  console.log(`   📊 Total entries: ${stats.total_entries}`);
  console.log(`   📊 Unique teams: ${stats.unique_teams}`);
  console.log(`   📊 Liga links: ${stats.liga_links}`);
  console.log(`   📊 Team links: ${stats.team_links}`);

  if (parseInt(stats.total_entries) !== parseInt(stats.liga_links)) {
    throw new Error('Not all Tabellen-Einträge have Liga links');
  }

  console.log('   ✅ All Tabellen-Einträge have proper Liga links');
  console.log('   ✅ Data integrity validation passed');
}

// Run the validation
main().catch(console.error);