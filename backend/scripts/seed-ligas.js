/**
 * Script to create Liga entries with proper kurz_name values
 * Run with: npm run strapi console
 * Then: .load scripts/seed-ligas.js
 */

async function seedLigas() {
  try {
    console.log('🏈 Starting Liga seeding...');
    
    // Check if we need a Saison first
    let saison = await strapi.entityService.findMany('api::saison.saison', {
      limit: 1
    });
    
    if (saison.length === 0) {
      console.log('Creating default Saison...');
      saison = await strapi.entityService.create('api::saison.saison', {
        data: {
          name: '2024/2025',
          start_datum: '2024-08-01',
          end_datum: '2025-05-31',
          aktiv: true
        }
      });
      console.log('✅ Created Saison: 2024/2025');
    } else {
      saison = saison[0];
      console.log(`✓ Using existing Saison: ${saison.name}`);
    }
    
    // Define Liga entries to create
    const ligasToCreate = [
      {
        name: 'Kreisliga Tauberbischofsheim',
        kurz_name: 'Kreisliga',
        saison: saison.id
      },
      {
        name: 'Kreisklasse A Tauberbischofsheim',
        kurz_name: 'Kreisklasse A',
        saison: saison.id
      },
      {
        name: 'Kreisklasse B Tauberbischofsheim',
        kurz_name: 'Kreisklasse B',
        saison: saison.id
      }
    ];
    
    // Create or update Liga entries
    for (const ligaData of ligasToCreate) {
      try {
        // Check if Liga already exists
        const existingLiga = await strapi.entityService.findMany('api::liga.liga', {
          filters: {
            name: ligaData.name
          },
          limit: 1
        });
        
        if (existingLiga.length > 0) {
          // Update existing Liga with kurz_name if missing
          const liga = existingLiga[0];
          if (!liga.kurz_name || liga.kurz_name !== ligaData.kurz_name) {
            await strapi.entityService.update('api::liga.liga', liga.id, {
              data: {
                kurz_name: ligaData.kurz_name
              }
            });
            console.log(`✅ Updated existing Liga: "${ligaData.name}" -> kurz_name: "${ligaData.kurz_name}"`);
          } else {
            console.log(`✓ Liga "${ligaData.name}" already exists with correct kurz_name`);
          }
        } else {
          // Create new Liga
          const newLiga = await strapi.entityService.create('api::liga.liga', {
            data: ligaData
          });
          console.log(`✅ Created new Liga: "${newLiga.name}" (kurz_name: "${newLiga.kurz_name}")`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to process Liga "${ligaData.name}":`, error.message);
      }
    }
    
    console.log('🎉 Liga seeding completed!');
    
    // Show final Liga list
    const allLigas = await strapi.entityService.findMany('api::liga.liga');
    console.log('\n📋 Current Liga entries:');
    allLigas.forEach(liga => {
      console.log(`  - ${liga.name} (kurz_name: "${liga.kurz_name || 'NOT SET'}")`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding Ligas:', error);
  }
}

// Run the seeding
seedLigas();