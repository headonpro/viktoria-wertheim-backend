const fs = require('fs');
const path = require('path');

// Import der extrahierten Torschützendaten
const torschuetzenData = require('../../screenshot-data-extraction/extracted-data/torschuetzen-backend-ready.json');

/**
 * Script zum Import der Torschützendaten in Strapi
 * Aktualisiert bestehende Spieler mit den neuen Torschützendaten
 */
async function importTorschuetzenData() {
  console.log('🚀 Starte Import der Torschützendaten...');
  
  try {
    // Strapi Bootstrap
    const strapi = require('@strapi/strapi')();
    await strapi.load();
    
    const spielerService = strapi.service('api::spieler.spieler');
    const mitgliedService = strapi.service('api::mitglied.mitglied');
    
    console.log('📊 Verarbeite Torschützendaten...');
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const torschuetze of torschuetzenData.data.attributes.spieler) {
      const { name, tore } = torschuetze;
      const [vorname, ...nachnameTeile] = name.split(' ');
      const nachname = nachnameTeile.join(' ');
      
      console.log(`🔍 Suche Spieler: ${vorname} ${nachname}`);
      
      try {
        // Suche Mitglied nach Namen
        const mitglieder = await strapi.entityService.findMany('api::mitglied.mitglied', {
          filters: {
            vorname: { $containsi: vorname },
            nachname: { $containsi: nachname }
          }
        });
        
        if (mitglieder.length === 0) {
          console.log(`❌ Mitglied nicht gefunden: ${vorname} ${nachname}`);
          notFoundCount++;
          continue;
        }
        
        const mitglied = mitglieder[0];
        
        // Suche zugehörigen Spieler
        const spieler = await strapi.entityService.findMany('api::spieler.spieler', {
          filters: {
            mitglied: mitglied.id
          },
          populate: ['mitglied', 'mannschaft']
        });
        
        if (spieler.length === 0) {
          console.log(`❌ Spieler-Eintrag nicht gefunden für: ${vorname} ${nachname}`);
          notFoundCount++;
          continue;
        }
        
        const spielerEntry = spieler[0];
        
        // Aktualisiere Torschützendaten
        await strapi.entityService.update('api::spieler.spieler', spielerEntry.id, {
          data: {
            tore_saison: tore,
            // Behalte bestehende Spiele-Anzahl oder setze Standard
            spiele_saison: spielerEntry.spiele_saison || 18
          }
        });
        
        console.log(`✅ Aktualisiert: ${vorname} ${nachname} - ${tore} Tore`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Fehler bei ${vorname} ${nachname}:`, error.message);
        notFoundCount++;
      }
    }
    
    console.log('\n📈 Import-Zusammenfassung:');
    console.log(`✅ Erfolgreich aktualisiert: ${updatedCount} Spieler`);
    console.log(`❌ Nicht gefunden: ${notFoundCount} Spieler`);
    console.log(`📊 Gesamt verarbeitet: ${torschuetzenData.data.attributes.spieler.length} Einträge`);
    
    await strapi.destroy();
    console.log('🎉 Import abgeschlossen!');
    
  } catch (error) {
    console.error('💥 Fehler beim Import:', error);
    process.exit(1);
  }
}

// Script ausführen
if (require.main === module) {
  importTorschuetzenData();
}

module.exports = { importTorschuetzenData };