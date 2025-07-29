/**
 * Script to update Liga entries with proper kurz_name values
 * Run with: npm run strapi console
 * Then: .load scripts/update-liga-kurz-names.js
 */

async function updateLigaKurzNames() {
  try {
    console.log('🏈 Starting Liga kurz_name update...');
    
    // Get all Liga entries
    const ligas = await strapi.entityService.findMany('api::liga.liga');
    
    if (ligas.length === 0) {
      console.log('⚠️ No Liga entries found');
      return;
    }
    
    console.log(`Found ${ligas.length} Liga entries`);
    
    // Define kurz_name mappings
    const kurzNameMappings = {
      'Kreisliga Tauberbischofsheim': 'Kreisliga',
      'Kreisklasse A Tauberbischofsheim': 'Kreisklasse A',
      'Kreisklasse B Tauberbischofsheim': 'Kreisklasse B',
      'Bezirksliga Tauberbischofsheim': 'Bezirksliga',
      'Landesliga Tauberbischofsheim': 'Landesliga'
    };
    
    // Update each Liga entry
    for (const liga of ligas) {
      const kurzName = kurzNameMappings[liga.name];
      
      if (kurzName && liga.kurz_name !== kurzName) {
        try {
          await strapi.entityService.update('api::liga.liga', liga.id, {
            data: {
              kurz_name: kurzName
            }
          });
          console.log(`✅ Updated "${liga.name}" -> kurz_name: "${kurzName}"`);
        } catch (error) {
          console.error(`❌ Failed to update Liga "${liga.name}":`, error.message);
        }
      } else if (kurzName) {
        console.log(`✓ Liga "${liga.name}" already has correct kurz_name: "${liga.kurz_name}"`);
      } else {
        console.log(`⚠️ No kurz_name mapping found for Liga: "${liga.name}"`);
      }
    }
    
    console.log('🎉 Liga kurz_name update completed!');
    
  } catch (error) {
    console.error('❌ Error updating Liga kurz_names:', error);
  }
}

// Run the update
updateLigaKurzNames();