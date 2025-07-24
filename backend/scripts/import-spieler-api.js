/**
 * Direkter API-Import für Spielerdaten
 * 
 * Verwendung:
 * 1. Strapi starten: npm run develop
 * 2. In neuem Terminal: node scripts/import-spieler-api.js
 */

const axios = require('axios');
const { spielerDaten } = require('./seed-spieler-data');

const STRAPI_URL = 'http://localhost:1337';

// API-Token (falls nötig) - für lokale Entwicklung oft nicht erforderlich
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';

const apiClient = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    ...(API_TOKEN && { 'Authorization': `Bearer ${API_TOKEN}` })
  }
});

async function checkStrapiConnection() {
  try {
    const response = await apiClient.get('/mitglieder');
    console.log('✅ Strapi-Verbindung erfolgreich');
    return true;
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️  API-Zugriff eingeschränkt - versuche ohne Token...');
      return true;
    }
    console.error('❌ Strapi nicht erreichbar:', error.message);
    console.log('   Stelle sicher, dass Strapi läuft: npm run develop');
    return false;
  }
}

async function createMitglied(spielerData) {
  try {
    const response = await apiClient.post('/mitglieder', {
      data: {
        vorname: spielerData.vorname,
        nachname: spielerData.nachname,
        geburtsdatum: spielerData.geburtsdatum,
        nationalitaet: spielerData.nationalitaet,
        mitgliedsnummer: `VW${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        mitgliedsart: 'Aktiv',
        status: 'Aktiv',
        oeffentlich_sichtbar: true
      }
    });
    return response.data.data;
  } catch (error) {
    throw new Error(`Mitglied-Erstellung fehlgeschlagen: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function createSpieler(spielerData, mitgliedId) {
  try {
    // Erstelle Spieler ohne Relation
    const response = await apiClient.post('/spielers', {
      data: {
        vorname: spielerData.vorname,
        nachname: spielerData.nachname,
        status: 'aktiv'
      }
    });
    
    const spieler = response.data.data;
    
    // Versuche Relation nachträglich zu setzen
    try {
      await apiClient.put(`/spielers/${spieler.id}`, {
        data: {
          mitglied: mitgliedId
        }
      });
      console.log(`      🔗 Relation gesetzt`);
    } catch (relationError) {
      console.log(`      ⚠️  Relation konnte nicht gesetzt werden: ${relationError.response?.data?.error?.message || relationError.message}`);
    }
    
    return spieler;
  } catch (error) {
    throw new Error(`Spieler-Erstellung fehlgeschlagen: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function checkExistingMitglied(vorname, nachname) {
  try {
    const response = await apiClient.get('/mitglieder', {
      params: {
        'filters[vorname][$eq]': vorname,
        'filters[nachname][$eq]': nachname
      }
    });
    return response.data.data.length > 0 ? response.data.data[0] : null;
  } catch (error) {
    return null;
  }
}

async function checkExistingSpieler(vorname, nachname) {
  try {
    const response = await apiClient.get('/spielers', {
      params: {
        'filters[vorname][$eq]': vorname,
        'filters[nachname][$eq]': nachname
      }
    });
    return response.data.data.length > 0;
  } catch (error) {
    return false;
  }
}

async function importSpieler() {
  console.log('🚀 Starte Spieler-Import via API...');
  
  // Prüfe Strapi-Verbindung
  const connected = await checkStrapiConnection();
  if (!connected) {
    return;
  }

  let erstellteMitglieder = 0;
  let erstellteSpieler = 0;
  let uebersprungen = 0;
  let fehler = 0;

  console.log(`📋 Verarbeite ${spielerDaten.length} Spieler...\n`);

  for (const [index, spielerData] of spielerDaten.entries()) {
    const progress = `[${index + 1}/${spielerDaten.length}]`;
    
    try {
      // Prüfe ob Mitglied bereits existiert
      const existingMitglied = await checkExistingMitglied(spielerData.vorname, spielerData.nachname);
      
      // Prüfe ob Spieler bereits existiert
      const existingSpieler = await checkExistingSpieler(spielerData.vorname, spielerData.nachname);
      
      if (existingSpieler) {
        console.log(`${progress} ⏭️  ${spielerData.vorname} ${spielerData.nachname} (Spieler bereits vorhanden)`);
        uebersprungen++;
        continue;
      }

      let mitglied = existingMitglied;
      
      // Erstelle Mitglied falls nicht vorhanden
      if (!existingMitglied) {
        mitglied = await createMitglied(spielerData);
        erstellteMitglieder++;
        console.log(`${progress} ✅ Mitglied: ${spielerData.vorname} ${spielerData.nachname}`);
      } else {
        console.log(`${progress} 📋 Mitglied vorhanden: ${spielerData.vorname} ${spielerData.nachname}`);
      }

      // Erstelle Spieler
      const spieler = await createSpieler(spielerData, mitglied.id);
      erstellteSpieler++;
      console.log(`${progress} ⚽ Spieler: ${spielerData.vorname} ${spielerData.nachname}`);

    } catch (error) {
      fehler++;
      console.error(`${progress} ❌ ${spielerData.vorname} ${spielerData.nachname}: ${error.message}`);
    }

    // Kleine Pause zwischen Requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Import-Zusammenfassung:');
  console.log(`   ✅ Mitglieder erstellt: ${erstellteMitglieder}`);
  console.log(`   ⚽ Spieler erstellt: ${erstellteSpieler}`);
  console.log(`   ⏭️  Übersprungen: ${uebersprungen}`);
  console.log(`   ❌ Fehler: ${fehler}`);
  console.log(`   📋 Gesamt: ${spielerDaten.length}`);
  
  if (fehler === 0) {
    console.log('\n🎉 Import erfolgreich abgeschlossen!');
  } else {
    console.log('\n⚠️  Import mit Fehlern abgeschlossen. Prüfe die Logs oben.');
  }
}

// Skript ausführen
if (require.main === module) {
  importSpieler().catch(error => {
    console.error('💥 Kritischer Fehler:', error);
    process.exit(1);
  });
}

module.exports = { importSpieler };