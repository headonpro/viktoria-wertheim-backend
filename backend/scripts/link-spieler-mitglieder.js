/**
 * Automatische Verknüpfung von Spielern mit Mitgliedern
 * basierend auf Vor- und Nachname
 */

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';
const apiClient = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

async function linkSpielerMitglieder() {
  console.log('🔗 Starte automatische Verknüpfung von Spielern und Mitgliedern...\n');
  
  try {
    // Alle Mitglieder abrufen
    console.log('📋 Lade alle Mitglieder...');
    const mitgliederResponse = await apiClient.get('/mitglieder?pagination[limit]=100');
    const mitglieder = mitgliederResponse.data.data;
    console.log(`   ✅ ${mitglieder.length} Mitglieder geladen`);
    
    // Alle Spieler abrufen
    console.log('⚽ Lade alle Spieler...');
    const spielerResponse = await apiClient.get('/spielers?pagination[limit]=100');
    const spieler = spielerResponse.data.data;
    console.log(`   ✅ ${spieler.length} Spieler geladen\n`);
    
    let verknuepft = 0;
    let nichtGefunden = 0;
    let fehler = 0;
    
    // Für jeden Spieler das passende Mitglied finden
    for (const [index, spielerEntry] of spieler.entries()) {
      const progress = `[${index + 1}/${spieler.length}]`;
      const spielerAttrs = spielerEntry.attributes || spielerEntry;
      
      try {
        // Passendes Mitglied suchen
        const passendesMitglied = mitglieder.find(mitglied => {
          const mitgliedAttrs = mitglied.attributes || mitglied;
          return mitgliedAttrs.vorname === spielerAttrs.vorname && 
                 mitgliedAttrs.nachname === spielerAttrs.nachname;
        });
        
        if (passendesMitglied) {
          // Relation setzen
          await apiClient.put(`/spielers/${spielerEntry.id}`, {
            data: {
              mitglied: passendesMitglied.id
            }
          });
          
          verknuepft++;
          console.log(`${progress} ✅ ${spielerAttrs.vorname} ${spielerAttrs.nachname} → Mitglied ID ${passendesMitglied.id}`);
        } else {
          nichtGefunden++;
          console.log(`${progress} ❓ ${spielerAttrs.vorname} ${spielerAttrs.nachname} → Kein passendes Mitglied gefunden`);
        }
        
      } catch (error) {
        fehler++;
        console.log(`${progress} ❌ ${spielerAttrs.vorname} ${spielerAttrs.nachname} → Fehler: ${error.message}`);
      }
      
      // Kleine Pause zwischen Requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('\n📊 Verknüpfungs-Zusammenfassung:');
    console.log(`   ✅ Erfolgreich verknüpft: ${verknuepft}`);
    console.log(`   ❓ Nicht gefunden: ${nichtGefunden}`);
    console.log(`   ❌ Fehler: ${fehler}`);
    console.log(`   📋 Gesamt verarbeitet: ${spieler.length}`);
    
    if (verknuepft === spieler.length) {
      console.log('\n🎉 Perfekt! Alle Spieler wurden erfolgreich mit Mitgliedern verknüpft!');
    } else if (verknuepft > 0) {
      console.log('\n✅ Verknüpfung teilweise erfolgreich!');
      if (nichtGefunden > 0) {
        console.log('💡 Tipp: Prüfe die nicht gefundenen Einträge auf Schreibfehler in Namen');
      }
    } else {
      console.log('\n⚠️  Keine Verknüpfungen erstellt. Prüfe die Datenstruktur.');
    }
    
  } catch (error) {
    console.error('💥 Kritischer Fehler:', error.message);
  }
}

// Skript ausführen
if (require.main === module) {
  linkSpielerMitglieder().catch(error => {
    console.error('💥 Unerwarteter Fehler:', error);
    process.exit(1);
  });
}

module.exports = { linkSpielerMitglieder };