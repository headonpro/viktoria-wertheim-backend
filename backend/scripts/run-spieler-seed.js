/**
 * Einfaches Ausführungs-Skript für den Spieler-Import
 * 
 * Verwendung über Strapi Script:
 * npm run strapi script scripts/run-spieler-seed.js
 */

const { spielerDaten } = require('./seed-spieler-data');

module.exports = async ({ strapi }) => {
  console.log('🚀 Starte Spieler-Daten Import...');
  
  try {
    let erstellteMitglieder = 0;
    let erstellteSpieler = 0;
    let fehler = 0;

    for (const spielerData of spielerDaten) {
      try {
        // 1. Prüfe ob Mitglied bereits existiert
        const existingMitglied = await strapi.entityService.findMany('api::mitglied.mitglied', {
          filters: {
            vorname: spielerData.vorname,
            nachname: spielerData.nachname
          }
        });

        if (existingMitglied.length > 0) {
          console.log(`⏭️  Überspringe ${spielerData.vorname} ${spielerData.nachname} (bereits vorhanden)`);
          continue;
        }

        // 2. Mitglied erstellen
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
        console.log(`✅ Mitglied erstellt: ${spielerData.vorname} ${spielerData.nachname}`);

        // 3. Spieler erstellen (verknüpft mit Mitglied)
        const spieler = await strapi.entityService.create('api::spieler.spieler', {
          data: {
            vorname: spielerData.vorname,
            nachname: spielerData.nachname,
            mitglied: mitglied.id,
            status: 'aktiv'
          }
        });
        
        erstellteSpieler++;
        console.log(`⚽ Spieler erstellt: ${spielerData.vorname} ${spielerData.nachname}`);

      } catch (error) {
        fehler++;
        console.error(`❌ Fehler bei ${spielerData.vorname} ${spielerData.nachname}:`, error.message);
      }
    }

    console.log('\n📊 Import-Zusammenfassung:');
    console.log(`   Mitglieder erstellt: ${erstellteMitglieder}`);
    console.log(`   Spieler erstellt: ${erstellteSpieler}`);
    console.log(`   Fehler: ${fehler}`);
    console.log(`   Gesamt verarbeitet: ${spielerDaten.length}`);
    console.log('🎉 Import abgeschlossen!');

  } catch (error) {
    console.error('💥 Kritischer Fehler beim Import:', error);
  }
};