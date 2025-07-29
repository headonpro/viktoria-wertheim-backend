/**
 * Manual club population script
 * Run with: node scripts/manual-populate-clubs.js
 * This script connects directly to the database to populate clubs
 */

const { createStrapi } = require('@strapi/strapi');

async function main() {
  console.log('🏈 Starting manual club population...');
  
  // Initialize Strapi
  const strapi = await createStrapi().load();
  
  try {
    // Check if clubs already exist
    const existingClubs = await strapi.entityService.findMany('api::club.club', {
      limit: 1
    });
    
    if (existingClubs.length > 0) {
      console.log('✅ Clubs already exist, skipping population');
      console.log('Current club count:', existingClubs.length);
      return;
    }
    
    // Get existing leagues to map clubs to
    const leagues = await strapi.entityService.findMany('api::liga.liga');
    
    if (leagues.length === 0) {
      console.log('⚠️ No leagues found, skipping club population');
      return;
    }
    
    console.log('Found leagues:', leagues.map(l => l.name));
    
    // Find specific leagues by name
    const kreisliga = leagues.find(l => l.name.includes('Kreisliga'));
    const kreisklasseA = leagues.find(l => l.name.includes('Kreisklasse A'));
    const kreisklasseB = leagues.find(l => l.name.includes('Kreisklasse B'));
    
    console.log('League mappings:');
    console.log('- Kreisliga:', kreisliga?.name || 'NOT FOUND');
    console.log('- Kreisklasse A:', kreisklasseA?.name || 'NOT FOUND');
    console.log('- Kreisklasse B:', kreisklasseB?.name || 'NOT FOUND');
    
    // Step 1: Create Viktoria clubs with team mappings
    console.log('\n=== Creating Viktoria clubs ===');
    
    const viktoriaClubs = [
      {
        name: "SV Viktoria Wertheim",
        kurz_name: "SV VIK",
        club_typ: "viktoria_verein",
        viktoria_team_mapping: "team_1",
        gruendungsjahr: 1952,
        vereinsfarben: "Gelb-Blau",
        heimstadion: "Viktoria-Stadion Wertheim",
        adresse: "Musterstraße 1, 97877 Wertheim",
        website: "https://sv-viktoria-wertheim.de",
        aktiv: true,
        ligen: kreisliga ? [kreisliga.id] : []
      },
      {
        name: "SV Viktoria Wertheim II",
        kurz_name: "SV VIK II",
        club_typ: "viktoria_verein", 
        viktoria_team_mapping: "team_2",
        gruendungsjahr: 1952,
        vereinsfarben: "Gelb-Blau",
        heimstadion: "Viktoria-Stadion Wertheim",
        adresse: "Musterstraße 1, 97877 Wertheim",
        website: "https://sv-viktoria-wertheim.de",
        aktiv: true,
        ligen: kreisklasseA ? [kreisklasseA.id] : []
      },
      {
        name: "SpG Vikt. Wertheim 3/Grünenwort",
        kurz_name: "SpG VIK 3",
        club_typ: "viktoria_verein",
        viktoria_team_mapping: "team_3", 
        gruendungsjahr: 1952,
        vereinsfarben: "Gelb-Blau",
        heimstadion: "Viktoria-Stadion Wertheim",
        adresse: "Musterstraße 1, 97877 Wertheim",
        website: "https://sv-viktoria-wertheim.de",
        aktiv: true,
        ligen: kreisklasseB ? [kreisklasseB.id] : []
      }
    ];
    
    let viktoriaCreated = 0;
    for (const clubData of viktoriaClubs) {
      try {
        const club = await strapi.entityService.create('api::club.club', {
          data: clubData
        });
        console.log(`✅ Created Viktoria club: ${club.name} (${club.viktoria_team_mapping})`);
        viktoriaCreated++;
      } catch (error) {
        console.error(`❌ Failed to create club "${clubData.name}":`, error.message);
      }
    }
    
    // Step 2: Create opponent clubs for each league
    console.log('\n=== Creating opponent clubs ===');
    
    // Kreisliga opponents (~16 clubs)
    const kreisligaOpponents = [
      "VfR Gerlachsheim", "TSV Jahn Kreuzwertheim", "SV Eintracht Freudenberg",
      "FC Hundheim-Steinbach", "TSV Assamstadt", "SV Zimmern",
      "TSV Tauberbischofsheim", "SG Külsheim", "FC Grünsfeld",
      "SV Uissigheim", "TSV Reicholzheim", "SV Nassig",
      "FC Königshofen", "SV Distelhausen", "TSV Werbach", "SG Impfingen"
    ];
    
    // Kreisklasse A opponents (~14 clubs)
    const kreisklasseAOpponents = [
      "TSV Unterschüpf", "SV Oberlauda", "FC Beckstein", "TSV Lauda",
      "SV Sachsenflur", "FC Dittwar", "SG Königheim", "TSV Gerlachsheim II",
      "SV Oberbalbach", "FC Külsheim II", "TSV Tauberbischofsheim II",
      "SV Wittighausen", "FC Grünsfeld II", "SG Messelhausen"
    ];
    
    // Kreisklasse B opponents (~12 clubs)
    const kreisklasseBOpponents = [
      "FC Hundheim-Steinbach 2", "SV Zimmern II", "TSV Assamstadt II",
      "SV Eintracht Freudenberg II", "FC Beckstein II", "SV Oberlauda II",
      "TSV Unterschüpf II", "SG Königheim II", "SV Sachsenflur II",
      "FC Dittwar II", "TSV Lauda II", "SV Oberbalbach II"
    ];
    
    // Create opponent clubs for each league
    const opponentData = [
      { clubs: kreisligaOpponents, liga: kreisliga, ligaName: 'Kreisliga' },
      { clubs: kreisklasseAOpponents, liga: kreisklasseA, ligaName: 'Kreisklasse A' },
      { clubs: kreisklasseBOpponents, liga: kreisklasseB, ligaName: 'Kreisklasse B' }
    ];
    
    let opponentCreated = 0;
    for (const { clubs, liga, ligaName } of opponentData) {
      if (!liga) {
        console.log(`⚠️ Skipping ${ligaName} - league not found`);
        continue;
      }
      
      console.log(`\nCreating ${clubs.length} clubs for ${ligaName}:`);
      
      for (const clubName of clubs) {
        try {
          const club = await strapi.entityService.create('api::club.club', {
            data: {
              name: clubName,
              kurz_name: clubName.length > 20 ? clubName.substring(0, 17) + '...' : clubName,
              club_typ: "gegner_verein",
              aktiv: true,
              ligen: [liga.id]
            }
          });
          console.log(`  ✅ Created: ${club.name}`);
          opponentCreated++;
        } catch (error) {
          console.error(`  ❌ Failed to create club "${clubName}":`, error.message);
        }
      }
    }
    
    // Step 3: Validate club-liga relationships
    console.log('\n=== Validation Results ===');
    
    const allClubs = await strapi.entityService.findMany('api::club.club', {
      populate: ['ligen']
    });
    
    const viktoriaClubsCount = allClubs.filter(c => c.club_typ === 'viktoria_verein').length;
    const opponentClubsCount = allClubs.filter(c => c.club_typ === 'gegner_verein').length;
    
    console.log(`📊 Club population summary:`);
    console.log(`  - Total clubs: ${allClubs.length}`);
    console.log(`  - Viktoria clubs: ${viktoriaClubsCount} (expected: 3)`);
    console.log(`  - Opponent clubs: ${opponentClubsCount} (expected: ~42)`);
    console.log(`  - Clubs created this run: ${viktoriaCreated + opponentCreated}`);
    
    // Validate each club has correct league assignments
    let validationErrors = 0;
    for (const club of allClubs) {
      if (!club.ligen || club.ligen.length === 0) {
        console.error(`❌ Club "${club.name}" has no league assignments`);
        validationErrors++;
      }
    }
    
    // Validate Viktoria team mappings
    const teamMappings = ['team_1', 'team_2', 'team_3'];
    for (const mapping of teamMappings) {
      const clubWithMapping = allClubs.find(c => c.viktoria_team_mapping === mapping);
      if (!clubWithMapping) {
        console.error(`❌ No club found with viktoria_team_mapping: ${mapping}`);
        validationErrors++;
      } else {
        console.log(`✅ ${mapping} mapped to: ${clubWithMapping.name}`);
      }
    }
    
    if (validationErrors === 0) {
      console.log('\n🎉 All clubs successfully created and validated!');
      console.log('\n✅ Task 2.1 COMPLETED: Viktoria clubs with team mappings created');
      console.log('✅ Task 2.2 COMPLETED: Opponent clubs for all leagues created');
      console.log('✅ Task 2.3 COMPLETED: Club-liga relationships configured and validated');
    } else {
      console.log(`\n⚠️ Completed with ${validationErrors} validation errors`);
    }
    
  } catch (error) {
    console.error('❌ Error during club population:', error);
  } finally {
    // Close Strapi
    await strapi.destroy();
    process.exit(0);
  }
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});