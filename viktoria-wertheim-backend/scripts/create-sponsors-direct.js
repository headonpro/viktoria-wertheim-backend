const { createStrapi } = require('@strapi/strapi');

async function createSponsorsDirectly() {
  console.log('🌱 Creating sponsors directly...');

  let strapi;
  try {
    // Create Strapi instance
    strapi = await createStrapi();
    await strapi.load();

    // Sample sponsor data
    const sponsorsData = [
      {
        name: 'Sparkasse Tauberfranken',
        website_url: 'https://www.sparkasse-tauberfranken.de',
        beschreibung: 'Unser langjähriger Hauptsponsor und Partner für alle finanziellen Angelegenheiten.',
        kategorie: 'hauptsponsor',
        reihenfolge: 1,
        aktiv: true,
        publishedAt: new Date()
      },
      {
        name: 'Autohaus Müller',
        website_url: 'https://www.autohaus-mueller.de',
        beschreibung: 'Premium Partner für Mobilität und Fahrzeuge.',
        kategorie: 'premium',
        reihenfolge: 2,
        aktiv: true,
        publishedAt: new Date()
      },
      {
        name: 'Bäckerei Schmidt',
        website_url: 'https://www.baeckerei-schmidt.de',
        beschreibung: 'Frische Backwaren für unsere Vereinsfeste.',
        kategorie: 'partner',
        reihenfolge: 3,
        aktiv: true,
        publishedAt: new Date()
      }
    ];

    // Check if sponsors already exist
    const existingSponsors = await strapi.entityService.findMany('api::sponsor.sponsor');
    
    if (existingSponsors && existingSponsors.length > 0) {
      console.log('ℹ️  Sponsors already exist:', existingSponsors.length);
      return;
    }

    // Create sponsors
    for (const sponsorData of sponsorsData) {
      try {
        const sponsor = await strapi.entityService.create('api::sponsor.sponsor', {
          data: sponsorData
        });
        console.log(`✅ Created sponsor: ${sponsor.name}`);
      } catch (error) {
        console.error(`❌ Error creating sponsor ${sponsorData.name}:`, error.message);
      }
    }

    console.log('🎉 Sponsors creation completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (strapi) {
      await strapi.destroy();
    }
  }
}

// Run the script
createSponsorsDirectly()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });