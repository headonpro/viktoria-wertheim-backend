#!/usr/bin/env node

/**
 * Task 12: Daten-Migration und Cleanup durchführen
 * 
 * This script:
 * 1. Migrates existing Team table data to Tabellen-Einträge
 * 2. Cleans up Team Collection Type from opponent teams
 * 3. Validates data integrity after migration
 */

const { Client } = require('pg');

async function main() {
  console.log('🚀 Starting Task 12: Data Migration and Cleanup...\n');

  // Initialize database connection
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

    // Step 1: Check current data state
    console.log('\n📊 Checking current data state...');
    await checkCurrentDataState(client);
    
    // Step 2: Migrate existing Team table data to Tabellen-Einträge
    console.log('\n🔄 Migrating Team table data to Tabellen-Einträge...');
    await migrateTeamTableData(client);
    
    // Step 3: Clean up Team Collection Type from opponent teams
    console.log('\n🧹 Cleaning up Team Collection Type...');
    await cleanupTeamCollection(client);
    
    // Step 4: Validate data integrity
    console.log('\n✅ Validating data integrity...');
    await validateDataIntegrity(client);
    
    console.log('\n🎉 Task 12 completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

async function checkCurrentDataState(client) {
  // Check Teams
  const teamsResult = await client.query(`
    SELECT t.id, t.name, t.team_typ, l.name as liga_name
    FROM teams t
    LEFT JOIN teams_liga_lnk tll ON t.id = tll.team_id
    LEFT JOIN ligas l ON tll.liga_id = l.id
    ORDER BY t.team_typ, t.name
  `);
  
  console.log(`Found ${teamsResult.rows.length} teams:`);
  teamsResult.rows.forEach(team => {
    console.log(`  - ${team.name} (${team.team_typ || 'unknown'}) - Liga: ${team.liga_name || 'none'}`);
  });
  
  // Check Tabellen-Einträge
  const tabellenResult = await client.query(`
    SELECT te.id, te.team_name, te.platz, l.name as liga_name, t.name as team_relation_name
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    LEFT JOIN tabellen_eintraege_team_lnk tetl ON te.id = tetl.tabellen_eintrag_id
    LEFT JOIN teams t ON tetl.team_id = t.id
    ORDER BY l.name, te.platz
  `);
  
  console.log(`\nFound ${tabellenResult.rows.length} Tabellen-Einträge:`);
  tabellenResult.rows.forEach(entry => {
    console.log(`  - ${entry.team_name} (Platz ${entry.platz}) - Liga: ${entry.liga_name || 'none'} - Team Relation: ${entry.team_relation_name || 'none'}`);
  });
}

async function migrateTeamTableData(client) {
  // Get all Viktoria teams
  const viktoriaTeamsResult = await client.query(`
    SELECT t.id, t.name, t.team_typ, l.id as liga_id, l.name as liga_name
    FROM teams t
    LEFT JOIN teams_liga_lnk tll ON t.id = tll.team_id
    LEFT JOIN ligas l ON tll.liga_id = l.id
    WHERE t.team_typ = 'viktoria_mannschaft' OR t.name ILIKE '%viktoria%'
    ORDER BY t.name
  `);
  
  console.log(`Found ${viktoriaTeamsResult.rows.length} Viktoria teams to ensure in Tabellen-Einträge`);
  
  for (const team of viktoriaTeamsResult.rows) {
    if (!team.liga_id) {
      console.log(`⚠️  Team ${team.name} has no liga assigned, skipping...`);
      continue;
    }
    
    // Check if this team already exists in Tabellen-Einträge
    const existingEntryResult = await client.query(`
      SELECT te.id, te.team_name, te.platz
      FROM tabellen_eintraege te
      LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
      LEFT JOIN tabellen_eintraege_team_lnk tetl ON te.id = tetl.tabellen_eintrag_id
      WHERE (te.team_name = $1 OR tetl.team_id = $2) AND tell.liga_id = $3
    `, [team.name, team.id, team.liga_id]);
    
    if (existingEntryResult.rows.length === 0) {
      // Create Tabellen-Eintrag for this Viktoria team
      const platz = getInitialPlatzForTeam(team.name, team.liga_name);
      
      // Insert the Tabellen-Eintrag
      const insertResult = await client.query(`
        INSERT INTO tabellen_eintraege (
          team_name, platz, spiele, siege, unentschieden, niederlagen,
          tore_fuer, tore_gegen, tordifferenz, punkte,
          created_at, updated_at, published_at
        ) VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW(), NOW())
        RETURNING id
      `, [team.name, platz]);
      
      const tabellenEintragId = insertResult.rows[0].id;
      
      // Link to Liga
      await client.query(`
        INSERT INTO tabellen_eintraege_liga_lnk (tabellen_eintrag_id, liga_id)
        VALUES ($1, $2)
      `, [tabellenEintragId, team.liga_id]);
      
      // Link to Team
      await client.query(`
        INSERT INTO tabellen_eintraege_team_lnk (tabellen_eintrag_id, team_id)
        VALUES ($1, $2)
      `, [tabellenEintragId, team.id]);
      
      console.log(`✅ Created Tabellen-Eintrag for ${team.name} at position ${platz}`);
    } else {
      console.log(`ℹ️  Tabellen-Eintrag for ${team.name} already exists at position ${existingEntryResult.rows[0].platz}`);
    }
  }
}

function getInitialPlatzForTeam(teamName, ligaName) {
  // Based on the requirements, set initial positions for Viktoria teams
  if (ligaName === 'Kreisliga Tauberbischofsheim') {
    if (teamName.includes('Viktoria Wertheim') && !teamName.includes('II') && !teamName.includes('III')) {
      return 1; // SV Viktoria Wertheim on position 1
    }
  } else if (ligaName === 'Kreisklasse A Tauberbischofsheim') {
    if (teamName.includes('Viktoria Wertheim II')) {
      return 5; // SV Viktoria Wertheim II on position 5
    }
  } else if (ligaName === 'Kreisklasse B Tauberbischofsheim') {
    if (teamName.includes('Viktoria Wertheim') && (teamName.includes('III') || teamName.includes('3'))) {
      return 1; // All teams start at position 1 in Kreisklasse B
    }
  }
  
  return 1; // Default position
}

async function cleanupTeamCollection(client) {
  // Get all teams
  const teamsResult = await client.query(`
    SELECT id, name, team_typ
    FROM teams
    ORDER BY team_typ, name
  `);
  
  // Identify opponent teams (gegner_verein) that should be removed
  const opponentTeams = teamsResult.rows.filter(team => 
    team.team_typ === 'gegner_verein' || 
    (!team.name.toLowerCase().includes('viktoria') && team.team_typ !== 'viktoria_mannschaft')
  );
  
  console.log(`Found ${opponentTeams.length} opponent teams to remove:`);
  opponentTeams.forEach(team => {
    console.log(`  - ${team.name} (${team.team_typ || 'unknown type'})`);
  });
  
  // Remove opponent teams
  if (opponentTeams.length > 0) {
    const opponentIds = opponentTeams.map(team => team.id);
    
    // Remove related records first
    console.log('🧹 Cleaning up related records...');
    
    // Remove from link tables
    await client.query(`DELETE FROM next_game_cards_gegner_team_lnk WHERE team_id = ANY($1)`, [opponentIds]);
    await client.query(`DELETE FROM tabellen_eintraege_team_lnk WHERE team_id = ANY($1)`, [opponentIds]);
    await client.query(`DELETE FROM teams_liga_lnk WHERE team_id = ANY($1)`, [opponentIds]);
    await client.query(`DELETE FROM teams_saison_lnk WHERE team_id = ANY($1)`, [opponentIds]);
    
    // Remove the opponent teams
    const deleteResult = await client.query(`
      DELETE FROM teams WHERE team_typ = 'gegner_verein' OR (name NOT ILIKE '%viktoria%' AND team_typ != 'viktoria_mannschaft')
    `);
    console.log(`🗑️  Removed ${deleteResult.rowCount} opponent teams`);
  }
  
  // Ensure remaining teams are marked as viktoria_mannschaft
  const updateResult = await client.query(`
    UPDATE teams 
    SET team_typ = 'viktoria_mannschaft', updated_at = NOW()
    WHERE team_typ != 'viktoria_mannschaft'
  `);
  
  if (updateResult.rowCount > 0) {
    console.log(`✅ Updated ${updateResult.rowCount} teams to viktoria_mannschaft`);
  }
  
  // Show remaining teams
  const remainingTeamsResult = await client.query(`
    SELECT id, name, team_typ
    FROM teams
    ORDER BY name
  `);
  
  console.log(`\n📋 Remaining teams (${remainingTeamsResult.rows.length}):`);
  remainingTeamsResult.rows.forEach(team => {
    console.log(`  - ${team.name} (${team.team_typ})`);
  });
}

async function validateDataIntegrity(client) {
  console.log('🔍 Validating data integrity...');
  
  // Check 1: All remaining teams should be Viktoria teams
  const teamsResult = await client.query(`
    SELECT id, name, team_typ
    FROM teams
    ORDER BY name
  `);
  
  const nonViktoriaTeams = teamsResult.rows.filter(team => 
    team.team_typ !== 'viktoria_mannschaft' && 
    !team.name.toLowerCase().includes('viktoria')
  );
  
  if (nonViktoriaTeams.length > 0) {
    console.error('❌ Found non-Viktoria teams still in collection:');
    nonViktoriaTeams.forEach(team => console.error(`  - ${team.name}`));
    throw new Error('Data integrity check failed: Non-Viktoria teams found');
  }
  
  console.log(`✅ All ${teamsResult.rows.length} teams are Viktoria teams`);
  
  // Check 2: Viktoria teams should have corresponding Tabellen-Einträge
  for (const team of teamsResult.rows) {
    const tabellenEintraegeResult = await client.query(`
      SELECT te.id, te.team_name, te.platz, l.name as liga_name
      FROM tabellen_eintraege te
      LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
      LEFT JOIN ligas l ON tell.liga_id = l.id
      LEFT JOIN tabellen_eintraege_team_lnk tetl ON te.id = tetl.tabellen_eintrag_id
      WHERE te.team_name = $1 OR tetl.team_id = $2
    `, [team.name, team.id]);
    
    if (tabellenEintraegeResult.rows.length === 0) {
      console.warn(`⚠️  No Tabellen-Eintrag found for team: ${team.name}`);
    } else {
      console.log(`✅ Found ${tabellenEintraegeResult.rows.length} Tabellen-Eintrag(e) for ${team.name}`);
    }
  }
  
  // Check 3: Tabellen-Einträge data consistency
  const allTabellenEintraegeResult = await client.query(`
    SELECT te.id, te.team_name, te.platz, te.punkte, l.name as liga_name
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    ORDER BY l.name, te.platz
  `);
  
  console.log(`\n📊 Tabellen-Einträge summary:`);
  const ligaGroups = {};
  
  allTabellenEintraegeResult.rows.forEach(entry => {
    const ligaName = entry.liga_name || 'Unknown Liga';
    if (!ligaGroups[ligaName]) {
      ligaGroups[ligaName] = [];
    }
    ligaGroups[ligaName].push(entry);
  });
  
  Object.entries(ligaGroups).forEach(([ligaName, entries]) => {
    console.log(`\n${ligaName}: ${entries.length} teams`);
    entries
      .sort((a, b) => a.platz - b.platz)
      .forEach(entry => {
        const isViktoria = entry.team_name.toLowerCase().includes('viktoria');
        const marker = isViktoria ? '🟡' : '⚪';
        console.log(`  ${marker} ${entry.platz}. ${entry.team_name} (${entry.punkte} Punkte)`);
      });
  });
  
  console.log('\n✅ Data integrity validation completed successfully!');
}

// Run the migration
main().catch(console.error);