/**
 * Direkter Spieler-Import über Strapi Bootstrap
 * 
 * Verwendung: node scripts/import-spieler-direct.js
 */

const Strapi = require('@strapi/strapi');
const { spielerDaten } = require('./seed-spieler-data');

async function importSpieler() {
  console.log('🚀 Starte Spieler-Import...');
  
  let strapi;
  
  try {
    // Strapi-Instanz erstellen und laden
    strapi = Strapi();
    await strapi.load();
    
    console.log('✅ Strapi geladen');
    
    let erstellteMitglieder = 0;
    let erstellteSpieler = 0;
    let fehler = 0;
    let uebersprungen = 0;

    for (const spielerData of spielerDaten) {
      try {
        console.log(`🔄 Verarbeite: ${spielerData.vorname} ${spielerData.nachname}`);
        
        // 1. Prüfe ob Mitglied bereits existiert
        const existingMitglied = await strapi.entityService.findMany('api::mitglied.mitglied', {
          filters: {
            vorname: spielerData.vorname,
            nachname: spielerData.nachname
          }
        });

        if (existingMitglied.length > 0) {
          console.log(`   ⏭️  Bereits vorhanden, überspringe`);
          uebersprungen++;
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
        console.log(`   ✅ Mitglied erstellt (ID: ${mitglied.id})`);

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
        console.log(`   ⚽ Spieler erstellt (ID: ${spieler.id})`);

      } catch (error) {
        fehler++;
        console.error(`   ❌ Fehler: ${error.message}`);
      }
    }

    console.log('\n📊 Import-Zusammenfassung:');
    console.log(`   Mitglieder erstellt: ${erstellteMitglieder}`);
    console.log(`   Spieler erstellt: ${erstellteSpieler}`);
    console.log(`   Übersprungen: ${uebersprungen}`);
    console.log(`   Fehler: ${fehler}`);
    console.log(`   Gesamt verarbeitet: ${spielerDaten.length}`);
    console.log('🎉 Import abgeschlossen!');

  } catch (error) {
    console.error('💥 Kritischer Fehler:', error);
  } finally {
    if (strapi) {
      await strapi.destroy();
    }
    process.exit(0);
  }
}

// Skript starten
importSpieler();