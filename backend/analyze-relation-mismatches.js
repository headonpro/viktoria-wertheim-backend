/**
 * Comprehensive analysis of Collection Type relation mismatches
 */

const { Client } = require('pg');

async function analyzeRelationMismatches() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'viktoria_wertheim',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    const issues = [];

    // 1. Check for orphaned records in link tables
    console.log('\n🔍 Checking for orphaned records in link tables...');
    
    const linkTables = [
      { table: 'spiele_heimclub_lnk', foreign_key: 'club_id', target_table: 'clubs' },
      { table: 'spiele_auswaertsclub_lnk', foreign_key: 'club_id', target_table: 'clubs' },
      { table: 'spiele_unser_team_lnk', foreign_key: 'team_id', target_table: 'teams' },
      { table: 'spiele_liga_lnk', foreign_key: 'liga_id', target_table: 'ligas' },
      { table: 'spiele_saison_lnk', foreign_key: 'saison_id', target_table: 'saisons' },
      { table: 'teams_club_lnk', foreign_key: 'club_id', target_table: 'clubs' },
      { table: 'teams_liga_lnk', foreign_key: 'liga_id', target_table: 'ligas' },
      { table: 'teams_saison_lnk', foreign_key: 'saison_id', target_table: 'saisons' },
      { table: 'spieler_hauptteam_lnk', foreign_key: 'team_id', target_table: 'teams' },
      { table: 'spieler_aushilfe_teams_lnk', foreign_key: 'team_id', target_table: 'teams' },
      { table: 'spieler_mitglied_lnk', foreign_key: 'mitglied_id', target_table: 'mitglieder' },
      { table: 'spielerstatistiken_spieler_lnk', foreign_key: 'spieler_id', target_table: 'spieler' },
      { table: 'spielerstatistiken_team_lnk', foreign_key: 'team_id', target_table: 'teams' },
      { table: 'spielerstatistiken_saison_lnk', foreign_key: 'saison_id', target_table: 'saisons' },
      { table: 'tabellen_eintraege_club_lnk', foreign_key: 'club_id', target_table: 'clubs' },
      { table: 'tabellen_eintraege_liga_lnk', foreign_key: 'liga_id', target_table: 'ligas' },
      { table: 'news_artikel_kategorie_lnk', foreign_key: 'kategorie_id', target_table: 'kategorien' },
      { table: 'ligas_clubs_lnk', foreign_key: 'club_id', target_table: 'clubs' },
      { table: 'ligas_saison_lnk', foreign_key: 'saison_id', target_table: 'saisons' }
    ];

    for (const link of linkTables) {
      try {
        const orphanedQuery = `
          SELECT COUNT(*) as count
          FROM ${link.table} l
          LEFT JOIN ${link.target_table} t ON l.${link.foreign_key} = t.id
          WHERE t.id IS NULL;
        `;
        
        const result = await client.query(orphanedQuery);
        const orphanedCount = parseInt(result.rows[0].count);
        
        if (orphanedCount > 0) {
          issues.push({
            type: 'ORPHANED_RECORDS',
            table: link.table,
            target_table: link.target_table,
            foreign_key: link.foreign_key,
            count: orphanedCount,
            severity: 'HIGH'
          });
          console.log(`❌ Found ${orphanedCount} orphaned records in ${link.table} referencing ${link.target_table}`);
        } else {
          console.log(`✅ No orphaned records in ${link.table}`);
        }
      } catch (error) {
        console.log(`⚠️  Could not check ${link.table}: ${error.message}`);
      }
    }

    // 2. Check for missing reverse relations
    console.log('\n🔍 Checking for missing reverse relations...');
    
    // Check spiele without proper club relations
    const spieleWithoutClubs = await client.query(`
      SELECT s.id, s.datum
      FROM spiele s
      LEFT JOIN spiele_heimclub_lnk h ON s.id = h.spiel_id
      LEFT JOIN spiele_auswaertsclub_lnk a ON s.id = a.spiel_id
      WHERE h.spiel_id IS NULL OR a.spiel_id IS NULL;
    `);
    
    if (spieleWithoutClubs.rows.length > 0) {
      issues.push({
        type: 'MISSING_CLUB_RELATIONS',
        table: 'spiele',
        count: spieleWithoutClubs.rows.length,
        severity: 'HIGH',
        details: spieleWithoutClubs.rows
      });
      console.log(`❌ Found ${spieleWithoutClubs.rows.length} spiele without proper club relations`);
    }

    // Check teams without club relation
    const teamsWithoutClub = await client.query(`
      SELECT t.id, t.name
      FROM teams t
      LEFT JOIN teams_club_lnk tc ON t.id = tc.team_id
      WHERE tc.team_id IS NULL;
    `);
    
    if (teamsWithoutClub.rows.length > 0) {
      issues.push({
        type: 'TEAMS_WITHOUT_CLUB',
        table: 'teams',
        count: teamsWithoutClub.rows.length,
        severity: 'MEDIUM',
        details: teamsWithoutClub.rows
      });
      console.log(`❌ Found ${teamsWithoutClub.rows.length} teams without club relation`);
    }

    // Check spieler without mitglied relation
    const spielerWithoutMitglied = await client.query(`
      SELECT s.id, s.vorname, s.nachname
      FROM spieler s
      LEFT JOIN spieler_mitglied_lnk sm ON s.id = sm.spieler_id
      WHERE sm.spieler_id IS NULL;
    `);
    
    if (spielerWithoutMitglied.rows.length > 0) {
      issues.push({
        type: 'SPIELER_WITHOUT_MITGLIED',
        table: 'spieler',
        count: spielerWithoutMitglied.rows.length,
        severity: 'LOW',
        details: spielerWithoutMitglied.rows
      });
      console.log(`⚠️  Found ${spielerWithoutMitglied.rows.length} spieler without mitglied relation`);
    }

    // 3. Check for duplicate relations
    console.log('\n🔍 Checking for duplicate relations...');
    
    const duplicateChecks = [
      'spiele_heimclub_lnk',
      'spiele_auswaertsclub_lnk',
      'spiele_unser_team_lnk',
      'spieler_hauptteam_lnk',
      'spieler_mitglied_lnk'
    ];

    for (const table of duplicateChecks) {
      try {
        const duplicateQuery = `
          SELECT spiel_id, COUNT(*) as count
          FROM ${table}
          GROUP BY spiel_id
          HAVING COUNT(*) > 1;
        `;
        
        const result = await client.query(duplicateQuery);
        
        if (result.rows.length > 0) {
          issues.push({
            type: 'DUPLICATE_RELATIONS',
            table: table,
            count: result.rows.length,
            severity: 'HIGH',
            details: result.rows
          });
          console.log(`❌ Found duplicate relations in ${table}`);
          result.rows.forEach(row => {
            console.log(`  - Record ID ${row.spiel_id || row.spieler_id} has ${row.count} relations`);
          });
        }
      } catch (error) {
        // Table might not have spiel_id, try with other ID columns
        try {
          const duplicateQuery2 = `
            SELECT spieler_id, COUNT(*) as count
            FROM ${table}
            GROUP BY spieler_id
            HAVING COUNT(*) > 1;
          `;
          
          const result2 = await client.query(duplicateQuery2);
          
          if (result2.rows.length > 0) {
            issues.push({
              type: 'DUPLICATE_RELATIONS',
              table: table,
              count: result2.rows.length,
              severity: 'HIGH',
              details: result2.rows
            });
            console.log(`❌ Found duplicate relations in ${table}`);
          }
        } catch (error2) {
          console.log(`⚠️  Could not check duplicates in ${table}`);
        }
      }
    }

    // 4. Check for inconsistent data
    console.log('\n🔍 Checking for data inconsistencies...');
    
    // Check if spiele have both heim and auswaerts clubs set to the same club
    const sameClubMatches = await client.query(`
      SELECT s.id, s.datum, h.club_id as heim_club, a.club_id as auswaerts_club
      FROM spiele s
      JOIN spiele_heimclub_lnk h ON s.id = h.spiel_id
      JOIN spiele_auswaertsclub_lnk a ON s.id = a.spiel_id
      WHERE h.club_id = a.club_id;
    `);
    
    if (sameClubMatches.rows.length > 0) {
      issues.push({
        type: 'SAME_CLUB_MATCH',
        table: 'spiele',
        count: sameClubMatches.rows.length,
        severity: 'HIGH',
        details: sameClubMatches.rows
      });
      console.log(`❌ Found ${sameClubMatches.rows.length} matches where heim and auswaerts club are the same`);
    }

    // 5. Check for missing required relations based on schema
    console.log('\n🔍 Checking for missing required relations...');
    
    // Check spiele without required relations
    const spieleWithoutRequiredRelations = await client.query(`
      SELECT s.id, s.datum,
        CASE WHEN h.spiel_id IS NULL THEN 'missing_heimclub' END as missing_heim,
        CASE WHEN a.spiel_id IS NULL THEN 'missing_auswaertsclub' END as missing_auswaerts,
        CASE WHEN t.spiel_id IS NULL THEN 'missing_team' END as missing_team,
        CASE WHEN l.spiel_id IS NULL THEN 'missing_liga' END as missing_liga,
        CASE WHEN sa.spiel_id IS NULL THEN 'missing_saison' END as missing_saison
      FROM spiele s
      LEFT JOIN spiele_heimclub_lnk h ON s.id = h.spiel_id
      LEFT JOIN spiele_auswaertsclub_lnk a ON s.id = a.spiel_id
      LEFT JOIN spiele_unser_team_lnk t ON s.id = t.spiel_id
      LEFT JOIN spiele_liga_lnk l ON s.id = l.spiel_id
      LEFT JOIN spiele_saison_lnk sa ON s.id = sa.spiel_id
      WHERE h.spiel_id IS NULL OR a.spiel_id IS NULL OR t.spiel_id IS NULL OR l.spiel_id IS NULL OR sa.spiel_id IS NULL;
    `);
    
    if (spieleWithoutRequiredRelations.rows.length > 0) {
      issues.push({
        type: 'MISSING_REQUIRED_RELATIONS',
        table: 'spiele',
        count: spieleWithoutRequiredRelations.rows.length,
        severity: 'HIGH',
        details: spieleWithoutRequiredRelations.rows
      });
      console.log(`❌ Found ${spieleWithoutRequiredRelations.rows.length} spiele with missing required relations`);
    }

    // Summary
    console.log('\n📊 SUMMARY OF RELATION MISMATCHES:');
    console.log('=====================================');
    
    if (issues.length === 0) {
      console.log('✅ No relation mismatches found! All relations are consistent.');
    } else {
      const highSeverity = issues.filter(i => i.severity === 'HIGH').length;
      const mediumSeverity = issues.filter(i => i.severity === 'MEDIUM').length;
      const lowSeverity = issues.filter(i => i.severity === 'LOW').length;
      
      console.log(`Total issues found: ${issues.length}`);
      console.log(`- High severity: ${highSeverity}`);
      console.log(`- Medium severity: ${mediumSeverity}`);
      console.log(`- Low severity: ${lowSeverity}`);
      
      console.log('\nDetailed Issues:');
      issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.type} (${issue.severity})`);
        console.log(`   Table: ${issue.table}`);
        console.log(`   Count: ${issue.count}`);
        if (issue.target_table) {
          console.log(`   Target: ${issue.target_table}`);
        }
        if (issue.foreign_key) {
          console.log(`   Foreign Key: ${issue.foreign_key}`);
        }
      });
    }

    return issues;

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the analysis
analyzeRelationMismatches()
  .then(issues => {
    if (issues.length > 0) {
      process.exit(1); // Exit with error code if issues found
    }
  })
  .catch(error => {
    console.error('Failed to analyze relations:', error);
    process.exit(1);
  });