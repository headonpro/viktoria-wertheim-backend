/**
 * Bootstrap-Funktion für automatischen Spieler-Import
 * 
 * Diese Datei wird automatisch beim Strapi-Start ausgeführt.
 * Entferne oder kommentiere den Import-Aufruf aus, wenn er nicht mehr benötigt wird.
 */

const { spielerDaten } = require('../../scripts/seed-spieler-data');

module.exports = async () => {
  console.log('🚀 Bootstrap: Prüfe Spieler-Daten...');
  
  // Nur importieren wenn noch keine Spieler vorhanden sind
  try {
    const existingSpieler = await strapi.entityService.findMany('api::spieler.spieler', {
      limit: 1
    });
    
    if (existingSpieler.length > 0) {
      console.log('✅ Spieler bereits vorhanden, überspringe Import');
      return;
    }
    
    console.log('📋 Keine Spieler gefunden, starte automatischen Import...');
    await importSpielerdaten();
    
  } catch (error) {
    console.error('⚠️  Bootstrap-Import-Fehler:', error.message);
  }
};

async function importSpielerdaten() {
  let erstellteMitglieder = 0;
  let erstellteSpieler = 0;
  let fehler = 0;

  for (const spielerData of spielerDaten) {
    try {
      // Mitglied erstellen
      const mitglied = await strapi.entityService.create('api::mitglied.mitglied', {
        data: {
          vorname: spielerData.vorname,
          nachname: spielerData.nachname,
          geburtsdatum: spielerData.geburtsdatum,
          nationalitaet: spielerData.nationalitaet,
          mitgliedsnummer: `VW-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          mitgliedsart: 'Aktiv',
          status: 'Aktiv',
          oeffentlich_sichtbar: true
        }
      });
      
      erstellteMitglieder++;

      // Spieler erstellen
      await strapi.entityService.create('api::spieler.spieler', {
        data: {
          vorname: spielerData.vorname,
          nachname: spielerData.nachname,
          mitglied: mitglied.id,
          status: 'aktiv'
        }
      });
      
      erstellteSpieler++;
      console.log(`✅ ${spielerData.vorname} ${spielerData.nachname}`);

    } catch (error) {
      fehler++;
      console.error(`❌ ${spielerData.vorname} ${spielerData.nachname}: ${error.message}`);
    }
  }

  console.log(`\n📊 Bootstrap-Import: ${erstellteMitglieder} Mitglieder, ${erstellteSpieler} Spieler, ${fehler} Fehler`);
}