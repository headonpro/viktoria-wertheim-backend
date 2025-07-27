/**
 * Liga-Tabellen Data Seeding Script
 * Creates table entries for all three Viktoria Wertheim leagues
 */

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

// Default statistics for season start (all zeros)
const DEFAULT_STATS = {
  spiele: 0,
  siege: 0,
  unentschieden: 0,
  niederlagen: 0,
  tore_fuer: 0,
  tore_gegen: 0,
  tordifferenz: 0,
  punkte: 0
};

async function seedLigaTabellen() {
  console.log('🚀 Starting Liga-Tabellen seeding...');
  
  try {
    // Use global strapi instance (available when run via Strapi CLI)
    if (!global.strapi) {
      throw new Error('Strapi instance not available. Please run this script via: npm run strapi script seed-liga-tabellen');
    }
    
    let totalCreated = 0;
    let totalUpdated = 0;
    let errors = [];

    // Process each liga
    for (const [ligaName, teams] of Object.entries(LIGA_TABELLEN_DATA)) {
      console.log(`\n📊 Processing ${ligaName}...`);
      
      try {
        // Find or create the liga
        let liga = await global.strapi.entityService.findMany('api::liga.liga', {
          filters: { name: { $eq: ligaName } }
        });

        if (!liga || liga.length === 0) {
          console.log(`  ➕ Creating liga: ${ligaName}`);
          liga = await global.strapi.entityService.create('api::liga.liga', {
            data: {
              name: ligaName,
              kurz_name: ligaName.replace('Tauberbischofsheim', 'TB')
            }
          });
          liga = [liga]; // Wrap in array for consistency
        }

        const ligaId = liga[0].id;
        console.log(`  ✅ Liga found/created with ID: ${ligaId}`);

        // Process each team in the liga
        for (const teamData of teams) {
          try {
            // Check if entry already exists
            const existingEntry = await global.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
              filters: {
                liga: { id: ligaId },
                team_name: { $eq: teamData.team_name }
              }
            });

            const entryData = {
              liga: ligaId,
              team_name: teamData.team_name,
              platz: teamData.platz,
              ...DEFAULT_STATS
            };

            if (existingEntry && existingEntry.length > 0) {
              // Update existing entry
              await global.strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', existingEntry[0].id, {
                data: entryData
              });
              console.log(`    🔄 Updated: ${teamData.team_name} (Platz ${teamData.platz})`);
              totalUpdated++;
            } else {
              // Create new entry
              await global.strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
                data: entryData
              });
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

    console.log('\n✅ Liga-Tabellen seeding completed!');
    
    // Verify the data
    await verifySeededData();

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  } finally {
    // Don't destroy strapi when run via CLI
    console.log('🏁 Script execution completed');
  }
}

async function verifySeededData() {
  console.log('\n🔍 Verifying seeded data...');
  
  try {
    for (const ligaName of Object.keys(LIGA_TABELLEN_DATA)) {
      const entries = await global.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          liga: {
            name: { $eq: ligaName }
          }
        },
        populate: { liga: true },
        sort: 'platz:asc'
      });

      console.log(`  📊 ${ligaName}: ${entries.length} entries`);
      
      // Check for Viktoria teams
      const viktoriaTeams = entries.filter(entry => 
        entry.team_name.toLowerCase().includes('viktoria') || 
        entry.team_name.toLowerCase().includes('vikt.')
      );
      
      if (viktoriaTeams.length > 0) {
        viktoriaTeams.forEach(team => {
          console.log(`    🟡 Viktoria team found: ${team.team_name} (Platz ${team.platz})`);
        });
      }
    }
    
    console.log('✅ Data verification completed!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedLigaTabellen().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { seedLigaTabellen, LIGA_TABELLEN_DATA, DEFAULT_STATS };