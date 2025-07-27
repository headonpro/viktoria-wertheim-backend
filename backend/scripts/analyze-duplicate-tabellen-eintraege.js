#!/usr/bin/env node

/**
 * Analyze duplicate Tabellen-Einträge
 * This script identifies and reports duplicate entries without deleting them
 */

const { Client } = require('pg');

async function main() {
  console.log('🔍 Analyzing duplicate Tabellen-Einträge...\n');

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

    // Step 1: Get total count
    await getTotalCounts(client);

    // Step 2: Analyze duplicates by team and liga
    await analyzeDuplicatesByTeamAndLiga(client);

    // Step 3: Analyze entries without liga
    await analyzeEntriesWithoutLiga(client);

    // Step 4: Show detailed duplicate information
    await showDetailedDuplicates(client);

    // Step 5: Show Viktoria teams specifically
    await showViktoriaTeams(client);

    console.log('\n✅ Analysis completed!');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

async function getTotalCounts(client) {
  console.log('\n📊 Total counts:');
  
  const totalEntriesResult = await client.query('SELECT COUNT(*) as count FROM tabellen_eintraege');
  console.log(`  - Total Tabellen-Einträge: ${totalEntriesResult.rows[0].count}`);

  const totalLigasResult = await client.query('SELECT COUNT(*) as count FROM ligas');
  console.log(`  - Total Ligas: ${totalLigasResult.rows[0].count}`);

  const totalLinksResult = await client.query('SELECT COUNT(*) as count FROM tabellen_eintraege_liga_lnk');
  console.log(`  - Total Liga-Links: ${totalLinksResult.rows[0].count}`);
}

async function analyzeDuplicatesByTeamAndLiga(client) {
  console.log('\n🔍 Analyzing duplicates by team and liga:');
  
  const duplicatesResult = await client.query(`
    SELECT 
      te.team_name,
      COALESCE(l.name, 'NO LIGA') as liga_name,
      COUNT(*) as count,
      ARRAY_AGG(te.id ORDER BY te.id) as ids,
      ARRAY_AGG(te.platz ORDER BY te.id) as positions,
      ARRAY_AGG(te.punkte ORDER BY te.id) as points,
      ARRAY_AGG(te.created_at ORDER BY te.id) as created_dates
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    GROUP BY te.team_name, l.name
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, te.team_name
  `);

  if (duplicatesResult.rows.length === 0) {
    console.log('  ✅ No duplicates found!');
    return;
  }

  console.log(`  ❌ Found ${duplicatesResult.rows.length} teams with duplicates:\n`);
  
  let totalDuplicates = 0;
  duplicatesResult.rows.forEach((row, index) => {
    const duplicateCount = row.count - 1; // Subtract 1 because we keep one
    totalDuplicates += duplicateCount;
    
    console.log(`  ${index + 1}. ${row.team_name} in ${row.liga_name}:`);
    console.log(`     - Total entries: ${row.count} (${duplicateCount} duplicates)`);
    console.log(`     - IDs: ${row.ids.join(', ')}`);
    console.log(`     - Positions: ${row.positions.join(', ')}`);
    console.log(`     - Points: ${row.points.join(', ')}`);
    console.log(`     - Created: ${row.created_dates.map(d => d ? new Date(d).toLocaleDateString('de-DE') : 'null').join(', ')}`);
    console.log('');
  });

  console.log(`  📈 Summary: ${totalDuplicates} duplicate entries can be removed`);
}

async function analyzeEntriesWithoutLiga(client) {
  console.log('\n🔍 Analyzing entries without Liga:');
  
  const noLigaResult = await client.query(`
    SELECT 
      te.id,
      te.team_name,
      te.platz,
      te.punkte,
      te.created_at
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    WHERE tell.liga_id IS NULL
    ORDER BY te.team_name, te.id
  `);

  if (noLigaResult.rows.length === 0) {
    console.log('  ✅ All entries have Liga assigned!');
    return;
  }

  console.log(`  ❌ Found ${noLigaResult.rows.length} entries without Liga:\n`);
  
  noLigaResult.rows.forEach((row, index) => {
    console.log(`  ${index + 1}. ID ${row.id}: ${row.team_name}`);
    console.log(`     - Position: ${row.platz || 'null'}`);
    console.log(`     - Points: ${row.punkte || 'null'}`);
    console.log(`     - Created: ${row.created_at ? new Date(row.created_at).toLocaleDateString('de-DE') : 'null'}`);
    console.log('');
  });
}

async function showDetailedDuplicates(client) {
  console.log('\n📋 Detailed duplicate analysis:');
  
  // Get the worst offenders (teams with most duplicates)
  const worstDuplicatesResult = await client.query(`
    SELECT 
      te.team_name,
      COALESCE(l.name, 'NO LIGA') as liga_name,
      COUNT(*) as count
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    GROUP BY te.team_name, l.name
    HAVING COUNT(*) > 5
    ORDER BY COUNT(*) DESC
  `);

  if (worstDuplicatesResult.rows.length > 0) {
    console.log('  🚨 Teams with 5+ duplicates:');
    worstDuplicatesResult.rows.forEach(row => {
      console.log(`    - ${row.team_name} in ${row.liga_name}: ${row.count} entries`);
    });
  }

  // Show distribution by liga
  const ligaDistributionResult = await client.query(`
    SELECT 
      COALESCE(l.name, 'NO LIGA') as liga_name,
      COUNT(DISTINCT te.team_name) as unique_teams,
      COUNT(*) as total_entries,
      COUNT(*) - COUNT(DISTINCT te.team_name) as duplicate_entries
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    GROUP BY l.name
    ORDER BY duplicate_entries DESC
  `);

  console.log('\n  📊 Distribution by Liga:');
  ligaDistributionResult.rows.forEach(row => {
    console.log(`    - ${row.liga_name}:`);
    console.log(`      Unique teams: ${row.unique_teams}`);
    console.log(`      Total entries: ${row.total_entries}`);
    console.log(`      Duplicates: ${row.duplicate_entries}`);
    console.log('');
  });
}

async function showViktoriaTeams(client) {
  console.log('\n🟡 Viktoria teams analysis:');
  
  const viktoriaTeamsResult = await client.query(`
    SELECT 
      te.id,
      te.team_name,
      te.platz,
      te.punkte,
      COALESCE(l.name, 'NO LIGA') as liga_name,
      te.created_at
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    WHERE te.team_name ILIKE '%viktoria%'
    ORDER BY te.team_name, te.id
  `);

  if (viktoriaTeamsResult.rows.length === 0) {
    console.log('  ❌ No Viktoria teams found!');
    return;
  }

  console.log(`  Found ${viktoriaTeamsResult.rows.length} Viktoria entries:\n`);
  
  // Group by team name
  const viktoriaGroups = {};
  viktoriaTeamsResult.rows.forEach(row => {
    if (!viktoriaGroups[row.team_name]) {
      viktoriaGroups[row.team_name] = [];
    }
    viktoriaGroups[row.team_name].push(row);
  });

  Object.keys(viktoriaGroups).forEach(teamName => {
    const entries = viktoriaGroups[teamName];
    console.log(`  ${teamName} (${entries.length} entries):`);
    
    entries.forEach((entry, index) => {
      console.log(`    ${index + 1}. ID ${entry.id} - ${entry.liga_name}`);
      console.log(`       Position: ${entry.platz || 'null'}, Points: ${entry.punkte || 'null'}`);
      console.log(`       Created: ${entry.created_at ? new Date(entry.created_at).toLocaleDateString('de-DE') : 'null'}`);
    });
    console.log('');
  });
}

// Run the analysis
main().catch(console.error);