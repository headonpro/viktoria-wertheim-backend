/**
 * Script to create match directly via Strapi Entity Service
 * This bypasses API authentication issues
 */

const strapi = require('@strapi/strapi');

async function createMatchDirect() {
  console.log('⚽ Creating match: SV Viktoria Wertheim 7-0 FSV Tauberhöhe 2');
  
  try {
    // Initialize Strapi
    const app = await strapi().load();
    
    const matchData = {
      datum: '2025-07-20T15:00:00.000Z',
      heimclub: 1, // SV Viktoria Wertheim
      auswaertsclub: 17, // FSV Tauberhöhe 2
      unser_team: 1, // 1. Mannschaft
      liga: 2, // Kreisklasse A Tauberbischofsheim
      saison: 2, // Saison 25/26
      ist_heimspiel: true,
      status: 'beendet',
      tore_heim: 7,
      tore_auswaerts: 0,
      spielort: 'Sportplatz Wertheim',
      spieltag: 18,
      zuschauer: 120,
      spielbericht: 'Überragender Auftritt der 1. Mannschaft mit einem deutlichen 7:0 Sieg gegen FSV Tauberhöhe 2. Das Team zeigte von Beginn an eine starke Leistung und dominierte das Spiel über die gesamte Spielzeit.'
    };
    
    console.log('📤 Creating match via Entity Service...');
    
    // Create the match using Strapi's entity service
    const match = await strapi.entityService.create('api::spiel.spiel', {
      data: matchData
    });
    
    console.log('✅ Match created successfully!');
    console.log('📋 Match details:');
    console.log(`- ID: ${match.id}`);
    console.log(`- Date: ${matchData.datum}`);
    console.log(`- Score: ${matchData.tore_heim}-${matchData.tore_auswaerts}`);
    console.log(`- Status: ${matchData.status}`);
    
    return match;
    
  } catch (error) {
    console.error('❌ Error creating match:');
    console.error('Message:', error.message);
    if (error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    throw error;
  } finally {
    // Close Strapi
    if (strapi.isLoaded) {
      await strapi.destroy();
    }
  }
}

// Run the script
createMatchDirect()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });