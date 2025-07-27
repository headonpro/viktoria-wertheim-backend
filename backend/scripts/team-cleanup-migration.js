const { Client } = require('pg');

async function performTeamCleanup() {
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

    // First, let's check current teams
    console.log('\n🔍 Checking current teams...');
    const teamsResult = await client.query(`
      SELECT t.id, t.name, t.team_typ, t.tabellenplatz, t.punkte, t.spiele_gesamt,
             t.siege, t.unentschieden, t.niederlagen, t.tore_fuer, t.tore_gegen, t.tordifferenz,
             l.name as liga_name
      FROM teams t
      LEFT JOIN teams_liga_lnk tll ON t.id = tll.team_id
      LEFT JOIN ligas l ON tll.liga_id = l.id
      ORDER BY t.team_typ, t.name
    `);

    console.log(`\n📊 Found ${teamsResult.rows.length} teams:`);
    teamsResult.rows.forEach(team => {
      console.log(`- ${team.name} (${team.team_typ}) - Liga: ${team.liga_name || 'No Liga'}`);
      console.log(`  Stats: Platz ${team.tabellenplatz}, ${team.punkte} Punkte, ${team.spiele_gesamt} Spiele`);
    });

    const viktoriaTeams = teamsResult.rows.filter(team => team.team_typ === 'viktoria_mannschaft');
    const gegnerTeams = teamsResult.rows.filter(team => team.team_typ === 'gegner_verein');

    console.log(`\n⚽ Viktoria teams to keep: ${viktoriaTeams.length}`);
    viktoriaTeams.forEach(team => console.log(`- ${team.name}`));

    console.log(`\n🏟️ Gegner teams to remove: ${gegnerTeams.length}`);
    gegnerTeams.forEach(team => console.log(`- ${team.name}`));

    // Step 1: Remove gegner teams (non-Viktoria teams)
    if (gegnerTeams.length > 0) {
      console.log('\n🗑️ Removing gegner teams...');
      const gegnerIds = gegnerTeams.map(team => team.id);
      
      // First check for any relations that might prevent deletion
      const relationsCheck = await client.query(`
        SELECT 'next_game_cards_gegner_team_lnk' as table_name, COUNT(*) as count 
        FROM next_game_cards_gegner_team_lnk 
        WHERE team_id = ANY($1)
        UNION ALL
        SELECT 'tabellen_eintraege_team_lnk' as table_name, COUNT(*) as count 
        FROM tabellen_eintraege_team_lnk 
        WHERE team_id = ANY($1)
        UNION ALL
        SELECT 'teams_liga_lnk' as table_name, COUNT(*) as count 
        FROM teams_liga_lnk 
        WHERE team_id = ANY($1)
        UNION ALL
        SELECT 'teams_saison_lnk' as table_name, COUNT(*) as count 
        FROM teams_saison_lnk 
        WHERE team_id = ANY($1)
      `, [gegnerIds]);

      console.log('📋 Checking relations:');
      relationsCheck.rows.forEach(row => {
        console.log(`- ${row.table_name}: ${row.count} references`);
      });

      // Remove related records first
      console.log('🧹 Cleaning up related records...');
      
      // Remove from link tables
      await client.query(`DELETE FROM next_game_cards_gegner_team_lnk WHERE team_id = ANY($1)`, [gegnerIds]);
      await client.query(`DELETE FROM tabellen_eintraege_team_lnk WHERE team_id = ANY($1)`, [gegnerIds]);
      await client.query(`DELETE FROM teams_liga_lnk WHERE team_id = ANY($1)`, [gegnerIds]);
      await client.query(`DELETE FROM teams_saison_lnk WHERE team_id = ANY($1)`, [gegnerIds]);
      
      // Remove the gegner teams
      const deleteResult = await client.query(`
        DELETE FROM teams WHERE team_typ = 'gegner_verein'
      `);
      console.log(`✅ Removed ${deleteResult.rowCount} gegner teams`);
    }

    // Step 2: Check if we need to remove table statistics fields from schema
    // This will be done by modifying the schema.json file
    console.log('\n📝 Schema modification needed for removing table statistics fields');
    console.log('Fields to remove from Team schema:');
    console.log('- tabellenplatz, punkte, spiele_gesamt');
    console.log('- siege, unentschieden, niederlagen');
    console.log('- tore_fuer, tore_gegen, tordifferenz');

    // Step 3: Show final state
    const finalTeamsResult = await client.query(`
      SELECT t.id, t.name, t.team_typ, l.name as liga_name
      FROM teams t
      LEFT JOIN teams_liga_lnk tll ON t.id = tll.team_id
      LEFT JOIN ligas l ON tll.liga_id = l.id
      ORDER BY t.name
    `);

    console.log(`\n✅ Final teams (${finalTeamsResult.rows.length}):`);
    finalTeamsResult.rows.forEach(team => {
      console.log(`- ${team.name} (${team.team_typ}) - Liga: ${team.liga_name || 'No Liga'}`);
    });

    return {
      removedTeams: gegnerTeams.length,
      remainingTeams: finalTeamsResult.rows
    };

  } catch (error) {
    console.error('❌ Error during team cleanup:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// If run directly
if (require.main === module) {
  performTeamCleanup().then((result) => {
    console.log(`\n🎉 Team cleanup completed successfully!`);
    console.log(`- Removed ${result.removedTeams} gegner teams`);
    console.log(`- Kept ${result.remainingTeams.length} Viktoria teams`);
    process.exit(0);
  }).catch(error => {
    console.error('❌ Team cleanup failed:', error);
    process.exit(1);
  });
}

module.exports = performTeamCleanup;