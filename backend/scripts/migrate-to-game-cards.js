/**
 * Migration script to create Game Card entries from existing Spiel data
 */

const { createStrapi } = require('@strapi/strapi');

async function migrateToGameCards() {
  const strapi = await createStrapi();
  
  try {
    console.log('🚀 Starting migration from Spiel to Game Cards...');
    
    // Fetch all existing Spiele with populated relations
    const spiele = await strapi.entityService.findMany('api::spiel.spiel', {
      populate: {
        heimclub: true,
        auswaertsclub: true,
        unser_team: true,
        liga: true
      }
    });
    
    console.log(`📊 Found ${spiele.length} Spiele to migrate`);
    
    let migrated = 0;
    let errors = 0;
    
    for (const spiel of spiele) {
      try {
        // Create simplified Game Card entry
        const gameCardData = {
          datum: spiel.datum,
          heimteam: spiel.heimclub?.name || 'Unbekannt',
          auswaertsteam: spiel.auswaertsclub?.name || 'Unbekannt',
          ist_heimspiel: spiel.ist_heimspiel,
          tore_heim: spiel.tore_heim,
          tore_auswaerts: spiel.tore_auswaerts,
          status: spiel.status,
          liga_name: spiel.liga?.name || '',
          spielort: spiel.spielort,
          unser_team_name: spiel.unser_team?.name || 'Viktoria Wertheim'
        };
        
        await strapi.entityService.create('api::game-card.game-card', {
          data: gameCardData
        });
        
        migrated++;
        console.log(`✅ Migrated: ${gameCardData.heimteam} vs ${gameCardData.auswaertsteam}`);
        
      } catch (error) {
        errors++;
        console.error(`❌ Error migrating spiel ${spiel.id}:`, error.message);
      }
    }
    
    console.log(`\n📈 Migration completed:`);
    console.log(`   ✅ Successfully migrated: ${migrated}`);
    console.log(`   ❌ Errors: ${errors}`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await strapi.destroy();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToGameCards();
}

module.exports = { migrateToGameCards };