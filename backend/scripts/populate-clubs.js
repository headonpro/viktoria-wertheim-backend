/**
 * Script to populate Club collection with initial data
 * Run with: npm run strapi script scripts/populate-clubs.js
 */

async function populateClubs() {
  console.log('Starting club population...');
  
  try {
    // Get existing leagues to map clubs to
    const leagues = await strapi.entityService.findMany('api::liga.liga', {
      populate: ['saison']
    });
    
    console.log('Found leagues:', leagues.map(l => l.name));
    
    // Find specific leagues by name
    const kreisliga = leagues.find(l => l.name.includes('Kreisliga Tauberbischofsheim'));
    const kreisklasseA = leagues.find(l => l.name.includes('Kreisklasse A Tauberbischofsheim'));
    const kreisklasseB = leagues.find(l => l.name.includes('Kreisklasse B Tauberbischofsheim'));
    
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
    
    for (const clubData of viktoriaClubs) {
      try {
        // Check if club already exists
        const existing = await strapi.entityService.findMany('api::club.club', {
          filters: { name: clubData.name }
        });
        
        if (existing.length > 0) {
          console.log(`✓ Club "${clubData.name}" already exists, skipping...`);
          continue;
        }
        
        const club = await strapi.entityService.create('api::club.club', {
          data: clubData
        });
        
        console.log(`✓ Created Viktoria club: ${club.name} (${club.viktoria_team_mapping})`);
      } catch (error) {
        console.error(`✗ Failed to create club "${clubData.name}":`, error.message);
      }
    }
    
    // Step 2: Create opponent clubs for each league
    console.log('\n=== Creating opponent clubs ===');
    
    // Kreisliga Tauberbischofsheim opponents (~16 clubs)
    const kreisligaOpponents = [
      "VfR Gerlachsheim",
      "TSV Jahn Kreuzwertheim", 
      "SV Eintracht Freudenberg",
      "FC Hundheim-Steinbach",
      "TSV Assamstadt",
      "SV Zimmern",
      "TSV Tauberbischofsheim",
      "SG Külsheim",
      "FC Grünsfeld",
      "SV Uissigheim",
      "TSV Reicholzheim",
      "SV Nassig",
      "FC Königshofen",
      "SV Distelhausen",
      "TSV Werbach",
      "SG Impfingen"
    ];
    
    // Kreisklasse A Tauberbischofsheim opponents (~14 clubs)
    const kreisklasseAOpponents = [
      "TSV Unterschüpf",
      "SV Oberlauda",
      "FC Beckstein",
      "TSV Lauda",
      "SV Sachsenflur",
      "FC Dittwar",
      "SG Königheim",
      "TSV Gerlachsheim II",
      "SV Oberbalbach",
      "FC Külsheim II",
      "TSV Tauberbischofsheim II",
      "SV Wittighausen",
      "FC Grünsfeld II",
      "SG Messelhausen"
    ];
    
    // Kreisklasse B Tauberbischofsheim opponents (~12 clubs)
    const kreisklasseBOpponents = [
      "FC Hundheim-Steinbach 2",
      "SV Zimmern II",
      "TSV Assamstadt II",
      "SV Eintracht Freudenberg II",
      "FC Beckstein II",
      "SV Oberlauda II",
      "TSV Unterschüpf II",
      "SG Königheim II",
      "SV Sachsenflur II",
      "FC Dittwar II",
      "TSV Lauda II",
      "SV Oberbalbach II"
    ];
    
    // Create opponent clubs for each league
    const opponentData = [
      { clubs: kreisligaOpponents, liga: kreisliga, ligaName: 'Kreisliga' },
      { clubs: kreisklasseAOpponents, liga: kreisklasseA, ligaName: 'Kreisklasse A' },
      { clubs: kreisklasseBOpponents, liga: kreisklasseB, ligaName: 'Kreisklasse B' }
    ];
    
    for (const { clubs, liga, ligaName } of opponentData) {
      if (!liga) {
        console.log(`⚠ Skipping ${ligaName} - league not found`);
        continue;
      }
      
      console.log(`\nCreating ${clubs.length} clubs for ${ligaName}:`);
      
      for (const clubName of clubs) {
        try {
          // Check if club already exists
          const existing = await strapi.entityService.findMany('api::club.club', {
            filters: { name: clubName }
          });
          
          if (existing.length > 0) {
            console.log(`  ✓ Club "${clubName}" already exists, skipping...`);
            continue;
          }
          
          const club = await strapi.entityService.create('api::club.club', {
            data: {
              name: clubName,
              kurz_name: clubName.length > 20 ? clubName.substring(0, 17) + '...' : clubName,
              club_typ: "gegner_verein",
              aktiv: true,
              ligen: [liga.id]
            }
          });
          
          console.log(`  ✓ Created: ${club.name}`);
        } catch (error) {
          console.error(`  ✗ Failed to create club "${clubName}":`, error.message);
        }
      }
    }
    
    // Step 3: Validate club-liga relationships
    console.log('\n=== Validating club-liga relationships ===');
    
    const allClubs = await strapi.entityService.findMany('api::club.club', {
      populate: ['ligen']
    });
    
    console.log(`Total clubs created: ${allClubs.length}`);
    
    const viktoriaClubsCount = allClubs.filter(c => c.club_typ === 'viktoria_verein').length;
    const opponentClubsCount = allClubs.filter(c => c.club_typ === 'gegner_verein').length;
    
    console.log(`- Viktoria clubs: ${viktoriaClubsCount}`);
    console.log(`- Opponent clubs: ${opponentClubsCount}`);
    
    // Validate each club has correct league assignments
    let validationErrors = 0;
    for (const club of allClubs) {
      if (!club.ligen || club.ligen.length === 0) {
        console.error(`✗ Club "${club.name}" has no league assignments`);
        validationErrors++;
      } else {
        console.log(`✓ Club "${club.name}" assigned to ${club.ligen.length} league(s)`);
      }
    }
    
    if (validationErrors === 0) {
      console.log('\n🎉 All clubs successfully created and validated!');
    } else {
      console.log(`\n⚠ Completed with ${validationErrors} validation errors`);
    }
    
  } catch (error) {
    console.error('Error during club population:', error);
  }
}

// Export for Strapi script runner
module.exports = async () => {
  await populateClubs();
};