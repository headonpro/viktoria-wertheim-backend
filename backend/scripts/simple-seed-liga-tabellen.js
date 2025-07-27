/**
 * Simple Liga-Tabellen Seeding Script
 * Uses direct database queries to seed the data
 */

const path = require('path');
const { Client } = require('pg');

// Database configuration from .env
const DB_CONFIG = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'viktoria_wertheim',
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
};

// Liga table data according to requirements
const LIGA_TABELLEN_DATA = {
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

async function seedLigaTabellen() {
  console.log('🚀 Starting Liga-Tabellen seeding with direct database access...');
  
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    let totalCreated = 0;
    let totalUpdated = 0;
    let errors = [];

    // Process each liga
    for (const [ligaName, teams] of Object.entries(LIGA_TABELLEN_DATA)) {
      console.log(`\n📊 Processing ${ligaName}...`);
      
      try {
        // Find or create the liga
        let ligaResult = await client.query(
          'SELECT id FROM ligas WHERE name = $1',
          [ligaName]
        );

        let ligaId;
        if (ligaResult.rows.length === 0) {
          console.log(`  ➕ Creating liga: ${ligaName}`);
          const insertResult = await client.query(
            'INSERT INTO ligas (document_id, name, kurz_name, created_at, updated_at, published_at) VALUES (gen_random_uuid()::varchar, $1, $2, NOW(), NOW(), NOW()) RETURNING id',
            [ligaName, ligaName.replace('Tauberbischofsheim', 'TB')]
          );
          ligaId = insertResult.rows[0].id;
        } else {
          ligaId = ligaResult.rows[0].id;
        }

        console.log(`  ✅ Liga found/created with ID: ${ligaId}`);

        // Process each team in the liga
        for (const teamData of teams) {
          try {
            // Check if entry already exists (by checking both main table and link table)
            const existingResult = await client.query(`
              SELECT te.id, te.team_name 
              FROM tabellen_eintraege te
              JOIN tabellen_eintraege_liga_lnk lnk ON te.id = lnk.tabellen_eintrag_id
              WHERE lnk.liga_id = $1 AND te.team_name = $2
            `, [ligaId, teamData.team_name]);

            if (existingResult.rows.length > 0) {
              // Update existing entry
              await client.query(`
                UPDATE tabellen_eintraege 
                SET platz = $1, spiele = 0, siege = 0, unentschieden = 0, niederlagen = 0,
                    tore_fuer = 0, tore_gegen = 0, tordifferenz = 0, punkte = 0, updated_at = NOW()
                WHERE id = $2
              `, [teamData.platz, existingResult.rows[0].id]);
              
              console.log(`    🔄 Updated: ${teamData.team_name} (Platz ${teamData.platz})`);
              totalUpdated++;
            } else {
              // Create new entry in main table
              const insertResult = await client.query(`
                INSERT INTO tabellen_eintraege 
                (document_id, team_name, platz, spiele, siege, unentschieden, niederlagen, 
                 tore_fuer, tore_gegen, tordifferenz, punkte, created_at, updated_at, published_at)
                VALUES (gen_random_uuid()::varchar, $1, $2, 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW(), NOW())
                RETURNING id
              `, [teamData.team_name, teamData.platz]);
              
              const tabellenEintragId = insertResult.rows[0].id;
              
              // Create link to liga
              await client.query(`
                INSERT INTO tabellen_eintraege_liga_lnk 
                (tabellen_eintrag_id, liga_id, tabellen_eintrag_ord)
                VALUES ($1, $2, $3)
              `, [tabellenEintragId, ligaId, teamData.platz]);
              
              console.log(`    ➕ Created: ${teamData.team_name} (Platz ${teamData.platz})`);
              totalCreated++;
            }

          } catch (teamError) {
            const errorMsg = `Failed to process team ${teamData.team_name}: ${teamError.message}`;
            console.error(`    ❌ ${errorMsg}`);
            errors.push(errorMsg);
          }
        }

        console.log(`  ✅ Completed ${ligaName}: ${teams.length} teams processed`);

      } catch (ligaError) {
        const errorMsg = `Failed to process liga ${ligaName}: ${ligaError.message}`;
        console.error(`  ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Summary
    console.log('\n📈 Seeding Summary:');
    console.log(`  ➕ Created: ${totalCreated} entries`);
    console.log(`  🔄 Updated: ${totalUpdated} entries`);
    console.log(`  ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(error => console.log(`  - ${error}`));
    }

    // Verify the data
    console.log('\n🔍 Verifying seeded data...');
    
    for (const ligaName of Object.keys(LIGA_TABELLEN_DATA)) {
      const result = await client.query(`
        SELECT te.team_name, te.platz, l.name as liga_name
        FROM tabellen_eintraege te
        JOIN tabellen_eintraege_liga_lnk lnk ON te.id = lnk.tabellen_eintrag_id
        JOIN ligas l ON lnk.liga_id = l.id
        WHERE l.name = $1
        ORDER BY te.platz ASC
      `, [ligaName]);

      console.log(`  📊 ${ligaName}: ${result.rows.length} entries`);
      
      // Check for Viktoria teams
      const viktoriaTeams = result.rows.filter(row => 
        row.team_name.toLowerCase().includes('viktoria') || 
        row.team_name.toLowerCase().includes('vikt.')
      );
      
      if (viktoriaTeams.length > 0) {
        viktoriaTeams.forEach(team => {
          console.log(`    🟡 Viktoria team found: ${team.team_name} (Platz ${team.platz})`);
        });
      }
    }

    console.log('\n✅ Liga-Tabellen seeding completed successfully!');

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Load environment variables manually
const fs = require('fs');

try {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.log('⚠️  Could not load .env file, using default values');
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedLigaTabellen()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedLigaTabellen, LIGA_TABELLEN_DATA };