/**
 * Debug script to test spiel creation
 * Run this in Strapi console: npm run console
 * Then: .load debug-spiel-creation.js
 */

async function createTestSpiel() {
  try {
    console.log('🔍 Checking existing data...');
    
    // Check if clubs exist
    const viktoria = await strapi.entityService.findMany('api::club.club', {
      filters: { id: 1 }
    });
    console.log('Viktoria Club:', viktoria.length > 0 ? 'Found' : 'Not found');
    
    const tauberhoehe = await strapi.entityService.findMany('api::club.club', {
      filters: { id: 17 }
    });
    console.log('Tauberhöhe Club:', tauberhoehe.length > 0 ? 'Found' : 'Not found');
    
    // Check team
    const team = await strapi.entityService.findMany('api::team.team', {
      filters: { id: 1 }
    });
    console.log('Team:', team.length > 0 ? 'Found' : 'Not found');
    
    // Check liga
    const liga = await strapi.entityService.findMany('api::liga.liga', {
      filters: { id: 2 }
    });
    console.log('Liga:', liga.length > 0 ? 'Found' : 'Not found');
    
    // Check saison
    const saison = await strapi.entityService.findMany('api::saison.saison', {
      filters: { id: 2 }
    });
    console.log('Saison:', saison.length > 0 ? 'Found' : 'Not found');
    
    console.log('📤 Creating spiel...');
    
    const spielData = {
      datum: '2025-07-20T15:00:00.000Z',
      heimclub: 1,
      auswaertsclub: 17,
      unser_team: 1,
      liga: 2,
      saison: 2,
      ist_heimspiel: true,
      status: 'beendet',
      tore_heim: 7,
      tore_auswaerts: 0,
      spielort: 'Sportplatz Wertheim',
      spieltag: 18,
      zuschauer: 120,
      spielbericht: 'Überragender Auftritt der 1. Mannschaft mit einem deutlichen 7:0 Sieg gegen FSV Tauberhöhe 2.'
    };
    
    const spiel = await strapi.entityService.create('api::spiel.spiel', {
      data: spielData
    });
    
    console.log('✅ Spiel created successfully!');
    console.log('ID:', spiel.id);
    console.log('Score:', spiel.tore_heim + '-' + spiel.tore_auswaerts);
    
    return spiel;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Export for console use
if (typeof module !== 'undefined') {
  module.exports = { createTestSpiel };
}

// Auto-run if called directly
if (require.main === module) {
  createTestSpiel();
}