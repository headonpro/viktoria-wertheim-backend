const strapi = require('@strapi/strapi');

async function seedSponsors() {
  console.log('🌱 Seeding sponsors...');

  try {
    // Sample sponsor data
    const sponsorsData = [
      {
        name: 'Sparkasse Tauberfranken',
        website_url: 'https://www.sparkasse-tauberfranken.de',
        beschreibung: 'Unser langjähriger Hauptsponsor und Partner für alle finanziellen Angelegenheiten. Seit über 20 Jahren unterstützt die Sparkasse Tauberfranken unseren Verein.',
        kategorie: 'hauptsponsor',
        reihenfolge: 1,
        aktiv: true,
        publishedAt: new Date()
      },
      {
        name: 'Autohaus Müller Wertheim',
        website_url: 'https://www.autohaus-mueller-wertheim.de',
        beschreibung: 'Premium Partner für Mobilität und Fahrzeuge. Das Autohaus Müller ist unser zuverlässiger Partner wenn es um Fahrzeuge geht.',
        kategorie: 'premium',
        reihenfolge: 2,
        aktiv: true,
        publishedAt: new Date()
      },
      {
        name: 'Physiotherapie Wertheim',
        website_url: 'https://www.physio-wertheim.de',
        beschreibung: 'Professionelle medizinische Betreuung unserer Sportler. Kompetente Behandlung von Sportverletzungen und Prävention.',
        kategorie: 'premium',
        reihenfolge: 3,
        aktiv: true,
        publishedAt: new Date()
      },
      {
        name: 'Bäckerei Schmidt',
        website_url: 'https://www.baeckerei-schmidt.de',
        beschreibung: 'Frische Backwaren für unsere Vereinsfeste und Events. Traditionelle Bäckerei aus der Region.',
        kategorie: 'partner',
        reihenfolge: 4,
        aktiv: true,
        publishedAt: new Date()
      },
      {
        name: 'Getränke Weber',
        website_url: 'https://www.getraenke-weber.de',
        beschreibung: 'Erfrischende Getränke für Spieler und Fans. Zuverlässiger Lieferant für alle Vereinsveranstaltungen.',
        kategorie: 'partner',
        reihenfolge: 5,
        aktiv: true,
        publishedAt: new Date()
      },
      {
        name: 'Elektro Hoffmann',
        website_url: 'https://www.elektro-hoffmann.de',
        beschreibung: 'Zuverlässige Elektroinstallationen und Wartung. Kompetenter Partner für alle elektrischen Anlagen im Verein.',
        kategorie: 'partner',
        reihenfolge: 6,
        aktiv: true,
        publishedAt: new Date()
      },
      {
        name: 'Metzgerei Braun',
        website_url: 'https://www.metzgerei-braun.de',
        beschreibung: 'Hochwertige Fleisch- und Wurstwaren für unsere Vereinsfeste. Traditionelle Metzgerei mit regionalen Produkten.',
        kategorie: 'partner',
        reihenfolge: 7,
        aktiv: true,
        publishedAt: new Date()
      },
      {
        name: 'Gärtnerei Grün',
        website_url: 'https://www.gaertnerei-gruen.de',
        beschreibung: 'Pflege und Gestaltung unserer Vereinsanlagen. Professionelle Garten- und Landschaftspflege.',
        kategorie: 'partner',
        reihenfolge: 8,
        aktiv: true,
        publishedAt: new Date()
      }
    ];

    // Check if sponsors already exist
    const existingSponsors = await strapi.entityService.findMany('api::sponsor.sponsor');
    
    if (existingSponsors && existingSponsors.length > 0) {
      console.log('ℹ️  Sponsors already exist, skipping seeding');
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

    console.log('🎉 Sponsors seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding sponsors:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = { seedSponsors };

// Run directly if called from command line
if (require.main === module) {
  (async () => {
    try {
      const app = await strapi.createStrapi();
      await app.load();
      await seedSponsors();
      await app.destroy();
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  })();
}