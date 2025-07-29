// import type { Core } from '@strapi/strapi';

/**
 * Populate initial club data
 */
async function populateInitialClubs(strapi: any) {
  try {
    strapi.log.info('🏈 Starting initial club population...');
    
    // Check if clubs already exist
    const existingClubs = await strapi.entityService.findMany('api::club.club', {
      limit: 1
    });
    
    if (existingClubs.length > 0) {
      strapi.log.info('✅ Clubs already exist, skipping population');
      return;
    }
    
    // Get existing leagues to map clubs to
    const leagues = await strapi.entityService.findMany('api::liga.liga');
    
    if (leagues.length === 0) {
      strapi.log.warn('⚠️ No leagues found, skipping club population');
      return;
    }
    
    strapi.log.info('Found leagues:', leagues.map(l => l.name));
    
    // Find specific leagues by name
    const kreisliga = leagues.find(l => l.name.includes('Kreisliga'));
    const kreisklasseA = leagues.find(l => l.name.includes('Kreisklasse A'));
    const kreisklasseB = leagues.find(l => l.name.includes('Kreisklasse B'));
    
    // Step 1: Create Viktoria clubs with team mappings
    strapi.log.info('Creating Viktoria clubs...');
    
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
        const club = await strapi.entityService.create('api::club.club', {
          data: clubData
        });
        strapi.log.info(`✅ Created Viktoria club: ${club.name} (${club.viktoria_team_mapping})`);
      } catch (error) {
        strapi.log.error(`❌ Failed to create club "${clubData.name}":`, error.message);
      }
    }
    
    // Step 2: Create opponent clubs for each league
    strapi.log.info('Creating opponent clubs...');
    
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
    
    for (const { clubs, liga, ligaName } of opponentData) {
      if (!liga) {
        strapi.log.warn(`⚠️ Skipping ${ligaName} - league not found`);
        continue;
      }
      
      strapi.log.info(`Creating ${clubs.length} clubs for ${ligaName}...`);
      
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
          strapi.log.info(`  ✅ Created: ${club.name}`);
        } catch (error) {
          strapi.log.error(`  ❌ Failed to create club "${clubName}":`, error.message);
        }
      }
    }
    
    // Step 3: Validate club-liga relationships
    strapi.log.info('Validating club-liga relationships...');
    
    const allClubs = await strapi.entityService.findMany('api::club.club', {
      populate: ['ligen']
    });
    
    const viktoriaClubsCount = allClubs.filter(c => c.club_typ === 'viktoria_verein').length;
    const opponentClubsCount = allClubs.filter(c => c.club_typ === 'gegner_verein').length;
    
    strapi.log.info(`📊 Club population summary:`);
    strapi.log.info(`  - Total clubs: ${allClubs.length}`);
    strapi.log.info(`  - Viktoria clubs: ${viktoriaClubsCount}`);
    strapi.log.info(`  - Opponent clubs: ${opponentClubsCount}`);
    
    // Validate each club has correct league assignments
    let validationErrors = 0;
    for (const club of allClubs) {
      if (!club.ligen || club.ligen.length === 0) {
        strapi.log.error(`❌ Club "${club.name}" has no league assignments`);
        validationErrors++;
      }
    }
    
    if (validationErrors === 0) {
      strapi.log.info('🎉 All clubs successfully created and validated!');
    } else {
      strapi.log.warn(`⚠️ Completed with ${validationErrors} validation errors`);
    }
    
  } catch (error) {
    strapi.log.error('❌ Error during initial club population:', error);
  }
}

/**
 * Set up public permissions for API endpoints
 */
async function setupPublicPermissions(strapi: any) {
  try {
    // Get the public role
    const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' }
    });

    if (!publicRole) {
      strapi.log.warn('Public role not found, skipping permission setup');
      return;
    }

    // Define the content types that should be publicly accessible
    const publicContentTypes = [
      'api::news-artikel.news-artikel',
      'api::kategorie.kategorie',
      'api::tabellen-eintrag.tabellen-eintrag',
      'api::team.team',
      'api::liga.liga',
      'api::sponsor.sponsor',
      'api::veranstaltung.veranstaltung',
      'api::game-card.game-card',
      'api::next-game-card.next-game-card',
      'api::saison.saison',
      'api::club.club'
    ];

    // Set up find and findOne permissions for each content type
    for (const contentType of publicContentTypes) {
      try {
        // Check if permissions already exist
        const existingPermissions = await strapi.query('plugin::users-permissions.permission').findMany({
          where: {
            role: publicRole.id,
            action: { $in: [`${contentType}.find`, `${contentType}.findOne`] }
          }
        });

        const existingActions = existingPermissions.map(p => p.action);

        // Create find permission if it doesn't exist
        if (!existingActions.includes(`${contentType}.find`)) {
          await strapi.query('plugin::users-permissions.permission').create({
            data: {
              action: `${contentType}.find`,
              subject: null,
              properties: {},
              conditions: [],
              role: publicRole.id
            }
          });
          strapi.log.info(`Created public find permission for ${contentType}`);
        }

        // Create findOne permission if it doesn't exist
        if (!existingActions.includes(`${contentType}.findOne`)) {
          await strapi.query('plugin::users-permissions.permission').create({
            data: {
              action: `${contentType}.findOne`,
              subject: null,
              properties: {},
              conditions: [],
              role: publicRole.id
            }
          });
          strapi.log.info(`Created public findOne permission for ${contentType}`);
        }

      } catch (error) {
        strapi.log.error(`Failed to set up permissions for ${contentType}:`, error);
      }
    }

    strapi.log.info('Public API permissions setup completed');

  } catch (error) {
    strapi.log.error('Failed to set up public permissions:', error);
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) { },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: any }) {
    try {
      // Set up public API permissions for frontend access
      await setupPublicPermissions(strapi);

      // Create default categories if they don't exist
      try {
        const existingCategories = await strapi.entityService.findMany('api::kategorie.kategorie');
        
        if (existingCategories.length === 0) {
          const defaultCategories = [
            {
              name: 'Mannschaft',
              beschreibung: 'News über die Mannschaften',
              farbe: '#FFD700',
              reihenfolge: 1
            },
            {
              name: 'Verein',
              beschreibung: 'Vereinsnachrichten',
              farbe: '#003366',
              reihenfolge: 2
            },
            {
              name: 'Jugend',
              beschreibung: 'Jugendmannschaften',
              farbe: '#354992',
              reihenfolge: 3
            },
            {
              name: 'Veranstaltungen',
              beschreibung: 'Vereinsveranstaltungen',
              farbe: '#FF6B35',
              reihenfolge: 4
            }
          ];

          for (const category of defaultCategories) {
            await strapi.entityService.create('api::kategorie.kategorie', {
              data: category
            });
          }
          
          strapi.log.info('✅ Default categories created successfully');
        }
      } catch (error) {
        strapi.log.error('❌ Error creating default categories:', error);
      }

      // Populate clubs if they don't exist
      await populateInitialClubs(strapi);

      strapi.log.info('Backend initialization completed successfully');

    } catch (error) {
      strapi.log.error('Failed to initialize automated data processing services:', error);
    }
  },
};
