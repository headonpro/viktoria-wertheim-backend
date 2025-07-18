/**
 * Bootstrap-Funktion - wird beim Strapi-Start ausgeführt
 */

const seedKategorien = require('../../scripts/seed-kategorien');

module.exports = async () => {
  console.log('🚀 Bootstrap wird ausgeführt...');
  
  try {
    // Seed Kategorien
    await seedKategorien();
    
    console.log('✅ Bootstrap abgeschlossen!');
  } catch (error) {
    console.error('❌ Fehler beim Bootstrap:', error);
  }
}; 