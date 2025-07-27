#!/usr/bin/env node

/**
 * Reset Tabellen-Einträge and recreate clean data
 * This script completely resets the Tabellen-Einträge and recreates them properly
 */

const { Client } = require('pg');

async function main() {
  console.log('🔄 Resetting Tabellen-Einträge...\n');

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

    // Step 1: Clear all existing Tabellen-Einträge
    console.log('\n🗑️ Clearing existing Tabellen-Einträge...');
    await clearTabellenEintraege(client);

    // Step 2: Recreate clean Tabellen-Einträge
    console.log('\n✨ Creating clean Tabellen-Einträge...');
    await createCleanTabellenEintraege(client);

    // Step 3: Verify the result
    console.log('\n✅ Verifying result...');
    await verifyResult(client);

    console.log('\n🎉 Reset completed successfully!');

  } catch (error) {
    console.error('❌ Error during reset:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

async function clearTabellenEintraege(client) {
  // Delete all link table entries
  await client.query('DELETE FROM tabellen_eintraege_liga_lnk');
  await client.query('DELETE FROM tabellen_eintraege_team_lnk');
  
  // Delete all Tabellen-Einträge
  const deleteResult = await client.query('DELETE FROM tabellen_eintraege');
  console.log(`Deleted ${deleteResult.rowCount} Tabellen-Einträge`);
  
  // Reset the sequence
  await client.query("SELECT setval('tabellen_eintraege_id_seq', 1, false)");
  console.log('Reset ID sequence');
}

async function createCleanTabellenEintraege(client) {
  // Get Liga IDs
  const ligasResult = await client.query('SELECT id, name FROM ligas ORDER BY name');
  const ligas = {};
  ligasResult.rows.forEach(liga => {
    ligas[liga.name] = liga.id;
  });

  console.log('Found Ligas:', Object.keys(ligas));

  // Define the league tables data
  const leagueData = {
    'Kreisliga Tauberbischofsheim': [
      { team_name: 'SV Viktoria Wertheim', platz: 1 },
      { team_name: 'VfR Gerlachsheim', platz: 2 },
      { team_name: 'TSV Jahn Kreuzwertheim', platz: 3 },
      { team_name: 'TSV Assamstadt', platz: 4 },
      { team_name: 'FV Brehmbachtal', platz: 5 },
      { team_name: 'FC Hundheim-Steinbach', platz: 6 },
      { team_name: 'TuS Großrinderfeld', platz: 7 },
      { team_name: 'Türk Gücü Wertheim', platz: 8 },
      { team_name: 'SV Pülfringen', platz: 9 },
      { team_name: 'VfB Reicholzheim', platz: 10 },
      { team_name: 'FC Rauenberg', platz: 11 },
      { team_name: 'SV Schönfeld', platz: 12 },
      { team_name: 'TSG Impfingen II', platz: 13 },
      { team_name: '1. FC Umpfertal', platz: 14 },
      { team_name: 'Kickers DHK Wertheim', platz: 15 },
      { team_name: 'TSV Schwabhausen', platz: 16 }
    ],
    'Kreisklasse A Tauberbischofsheim': [
      { team_name: 'TSV Unterschüpf', platz: 1 },
      { team_name: 'SV Nassig II', platz: 2 },
      { team_name: 'TSV Dittwar', platz: 3 },
      { team_name: 'FV Oberlauda e.V.', platz: 4 },
      { team_name: 'SV Viktoria Wertheim II', platz: 5 },
      { team_name: 'FC Wertheim-Eichel', platz: 6 },
      { team_name: 'TSV Assamstadt II', platz: 7 },
      { team_name: 'FC Grünsfeld II', platz: 8 },
      { team_name: 'TSV Gerchsheim', platz: 9 },
      { team_name: 'SV Distelhausen II', platz: 10 },
      { team_name: 'TSV Wenkheim', platz: 11 },
      { team_name: 'SV Winzer Beckstein II', platz: 12 },
      { team_name: 'SV Oberbalbach', platz: 13 },
      { team_name: 'FSV Tauberhöhe II', platz: 14 }
    ],
    'Kreisklasse B Tauberbischofsheim': [
      { team_name: 'FC Hundheim-Steinbach 2', platz: 1 },
      { team_name: 'FC Wertheim-Eichel 2', platz: 1 },
      { team_name: 'SG RaMBo 2', platz: 1 },
      { team_name: 'SV Eintracht Nassig 3', platz: 1 },
      { team_name: 'SpG Kickers DHK Wertheim 2/Urphar', platz: 1 },
      { team_name: 'SpG Vikt. Wertheim 3/Grünenwort', platz: 1 },
      { team_name: 'TSV Kreuzwertheim 2', platz: 1 },
      { team_name: 'Turkgucu Wertheim 2', platz: 1 },
      { team_name: 'VfB Reicholzheim 2', platz: 1 }
    ]
  };

  // Create entries for each league
  for (const [ligaName, teams] of Object.entries(leagueData)) {
    const ligaId = ligas[ligaName];
    if (!ligaId) {
      console.warn(`⚠️  Liga not found: ${ligaName}`);
      continue;
    }

    console.log(`\nCreating entries for ${ligaName}:`);
    
    for (const teamData of teams) {
      // Insert Tabellen-Eintrag
      const insertResult = await client.query(`
        INSERT INTO tabellen_eintraege (
          team_name, platz, spiele, siege, unentschieden, niederlagen,
          tore_fuer, tore_gegen, tordifferenz, punkte,
          created_at, updated_at, published_at
        ) VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW(), NOW())
        RETURNING id
      `, [teamData.team_name, teamData.platz]);
      
      const tabellenEintragId = insertResult.rows[0].id;
      
      // Link to Liga
      await client.query(`
        INSERT INTO tabellen_eintraege_liga_lnk (tabellen_eintrag_id, liga_id)
        VALUES ($1, $2)
      `, [tabellenEintragId, ligaId]);
      
      // Try to link to Team if it exists (for Viktoria teams)
      if (teamData.team_name.toLowerCase().includes('viktoria')) {
        const teamResult = await client.query(`
          SELECT id FROM teams WHERE name ILIKE $1
        `, [`%${teamData.team_name}%`]);
        
        if (teamResult.rows.length > 0) {
          await client.query(`
            INSERT INTO tabellen_eintraege_team_lnk (tabellen_eintrag_id, team_id)
            VALUES ($1, $2)
          `, [tabellenEintragId, teamResult.rows[0].id]);
          console.log(`  ✅ ${teamData.team_name} (Platz ${teamData.platz}) - linked to team`);
        } else {
          console.log(`  ✅ ${teamData.team_name} (Platz ${teamData.platz}) - no team link`);
        }
      } else {
        console.log(`  ✅ ${teamData.team_name} (Platz ${teamData.platz})`);
      }
    }
  }

  // Also create entries for the Viktoria teams with their proper names
  console.log('\n🟡 Creating entries for Viktoria teams with proper names:');
  
  const viktoriaTeamsResult = await client.query(`
    SELECT t.id, t.name, l.id as liga_id, l.name as liga_name
    FROM teams t
    LEFT JOIN teams_liga_lnk tll ON t.id = tll.team_id
    LEFT JOIN ligas l ON tll.liga_id = l.id
    WHERE t.team_typ = 'viktoria_mannschaft'
    ORDER BY t.name
  `);

  for (const team of viktoriaTeamsResult.rows) {
    if (!team.liga_id) {
      console.log(`⚠️  Team ${team.name} has no liga assigned, skipping...`);
      continue;
    }

    // Check if we already have an entry for this team
    const existingResult = await client.query(`
      SELECT te.id
      FROM tabellen_eintraege te
      LEFT JOIN tabellen_eintraege_team_lnk tetl ON te.id = tetl.tabellen_eintrag_id
      WHERE tetl.team_id = $1
    `, [team.id]);

    if (existingResult.rows.length === 0) {
      // Determine position based on team and liga
      let platz = 1;
      if (team.liga_name === 'Kreisliga Tauberbischofsheim' && team.name.includes('1.')) {
        platz = 1;
      } else if (team.liga_name === 'Kreisklasse A Tauberbischofsheim' && team.name.includes('2.')) {
        platz = 5;
      } else if (team.liga_name === 'Kreisklasse B Tauberbischofsheim' && team.name.includes('3.')) {
        platz = 1;
      }

      // Insert Tabellen-Eintrag
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
      
      console.log(`  ✅ ${team.name} (Platz ${platz}) in ${team.liga_name}`);
    } else {
      console.log(`  ℹ️  ${team.name} already has a Tabellen-Eintrag`);
    }
  }
}

async function verifyResult(client) {
  // Check final counts
  const countsResult = await client.query(`
    SELECT 
      l.name as liga_name,
      COUNT(*) as team_count
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    GROUP BY l.name
    ORDER BY l.name
  `);

  console.log('\n📊 Final league table counts:');
  countsResult.rows.forEach(row => {
    console.log(`  - ${row.liga_name}: ${row.team_count} teams`);
  });

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
    console.error('\n❌ Found duplicates:');
    duplicatesResult.rows.forEach(row => {
      console.error(`  - ${row.team_name} in ${row.liga_name}: ${row.count} entries`);
    });
    throw new Error('Duplicates found after reset');
  }

  // Show Viktoria teams
  const viktoriaResult = await client.query(`
    SELECT 
      te.team_name,
      te.platz,
      l.name as liga_name,
      CASE WHEN tetl.team_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_team_link
    FROM tabellen_eintraege te
    LEFT JOIN tabellen_eintraege_liga_lnk tell ON te.id = tell.tabellen_eintrag_id
    LEFT JOIN ligas l ON tell.liga_id = l.id
    LEFT JOIN tabellen_eintraege_team_lnk tetl ON te.id = tetl.tabellen_eintrag_id
    WHERE te.team_name ILIKE '%viktoria%' OR te.team_name ILIKE '%mannschaft%'
    ORDER BY l.name, te.platz
  `);

  console.log('\n🟡 Viktoria teams in Tabellen-Einträge:');
  viktoriaResult.rows.forEach(row => {
    console.log(`  - ${row.team_name} (Platz ${row.platz}) in ${row.liga_name} - Team Link: ${row.has_team_link}`);
  });

  console.log('\n✅ Verification completed successfully!');
}

// Run the reset
main().catch(console.error);