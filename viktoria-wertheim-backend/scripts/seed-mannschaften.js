/**
 * Team Seeding Script - Erstellt die drei Hauptmannschaften mit realistischen Daten
 */

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';

// Realistische Mannschaftsdaten für die drei Teams
const mannschaftenData = [
  {
    name: 'SV Viktoria Wertheim I',
    liga: 'Kreisliga',
    liga_vollname: 'Kreisliga Tauberbischofsheim',
    altersklasse: 'senioren',
    status: 'aktiv',
    saison: '2024/25',
    spielort: 'Sportplatz Wertheim',
    vereinsfarben: 'Blau-Weiß',
    gruendungsjahr: 1920,
    beschreibung: 'Die erste Mannschaft des SV Viktoria Wertheim spielt in der Kreisliga Tauberbischofsheim und ist das Aushängeschild des Vereins.',
    trainingszeiten: 'Dienstag und Donnerstag 19:00-20:30 Uhr',
    
    // Tabellendaten (Mittelfeldplatz)
    tabellenplatz: 8,
    punkte: 23,
    spiele_gesamt: 16,
    siege: 7,
    unentschieden: 2,
    niederlagen: 7,
    tore_fuer: 28,
    tore_gegen: 31,
    tordifferenz: -3,
    form_letzte_5: ['N', 'S', 'U', 'N', 'S'], // Letztes Spiel zuerst
    trend: 'gleich'
  },
  {
    name: 'SV Viktoria Wertheim II',
    liga: 'Kreisklasse A',
    liga_vollname: 'Kreisklasse A Tauberbischofsheim',
    altersklasse: 'senioren',
    status: 'aktiv',
    saison: '2024/25',
    spielort: 'Sportplatz Wertheim',
    vereinsfarben: 'Blau-Weiß',
    gruendungsjahr: 1920,
    beschreibung: 'Die zweite Mannschaft des SV Viktoria Wertheim spielt in der Kreisklasse A und ist ein wichtiger Baustein für die Nachwuchsförderung.',
    trainingszeiten: 'Montag und Mittwoch 19:00-20:30 Uhr',
    
    // Tabellendaten (Oberes Mittelfeld)
    tabellenplatz: 5,
    punkte: 28,
    spiele_gesamt: 15,
    siege: 9,
    unentschieden: 1,
    niederlagen: 5,
    tore_fuer: 35,
    tore_gegen: 22,
    tordifferenz: 13,
    form_letzte_5: ['S', 'S', 'N', 'S', 'U'], // Letztes Spiel zuerst
    trend: 'steigend'
  },
  {
    name: 'SV Viktoria Wertheim III',
    liga: 'Kreisklasse B',
    liga_vollname: 'Kreisklasse B Tauberbischofsheim',
    altersklasse: 'senioren',
    status: 'aktiv',
    saison: '2024/25',
    spielort: 'Sportplatz Wertheim',
    vereinsfarben: 'Blau-Weiß',
    gruendungsjahr: 1920,
    beschreibung: 'Die dritte Mannschaft des SV Viktoria Wertheim spielt in der Kreisklasse B und bietet allen Spielern die Möglichkeit, aktiv Fußball zu spielen.',
    trainingszeiten: 'Freitag 19:00-20:30 Uhr',
    
    // Tabellendaten (Unteres Mittelfeld)
    tabellenplatz: 11,
    punkte: 18,
    spiele_gesamt: 14,
    siege: 5,
    unentschieden: 3,
    niederlagen: 6,
    tore_fuer: 24,
    tore_gegen: 28,
    tordifferenz: -4,
    form_letzte_5: ['N', 'N', 'S', 'U', 'N'], // Letztes Spiel zuerst
    trend: 'fallend'
  }
];

/**
 * Prüft ob Strapi erreichbar ist
 */
async function checkStrapiConnection() {
  try {
    await axios.get(`${STRAPI_URL}/api/mannschaften`);
    return true;
  } catch (error) {
    console.error('❌ Strapi ist nicht erreichbar. Stellen Sie sicher, dass Strapi läuft:', error.message);
    return false;
  }
}

/**
 * Prüft ob eine Mannschaft bereits existiert
 */
async function mannschaftExists(name) {
  try {
    const response = await axios.get(`${STRAPI_URL}/api/mannschaften`, {
      params: {
        filters: {
          name: name
        }
      }
    });
    return response.data.data.length > 0;
  } catch (error) {
    console.error(`Fehler beim Prüfen der Mannschaft "${name}":`, error.message);
    return false;
  }
}

/**
 * Erstellt eine einzelne Mannschaft
 */
async function createMannschaft(mannschaftData) {
  try {
    const response = await axios.post(`${STRAPI_URL}/api/mannschaften`, {
      data: mannschaftData
    });
    
    if (response.data && response.data.data) {
      console.log(`✅ Mannschaft "${mannschaftData.name}" erfolgreich erstellt (ID: ${response.data.data.id})`);
      return response.data.data;
    } else {
      console.error(`❌ Unerwartete Antwort beim Erstellen der Mannschaft "${mannschaftData.name}"`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen der Mannschaft "${mannschaftData.name}":`, 
      error.response?.data?.error?.message || error.message);
    return null;
  }
}

/**
 * Validiert Mannschaftsdaten vor dem Erstellen
 */
function validateMannschaftData(data) {
  const errors = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Name ist erforderlich');
  }
  
  if (!data.liga || data.liga.trim() === '') {
    errors.push('Liga ist erforderlich');
  }
  
  if (data.tabellenplatz < 1 || data.tabellenplatz > 20) {
    errors.push('Tabellenplatz muss zwischen 1 und 20 liegen');
  }
  
  if (data.punkte < 0) {
    errors.push('Punkte können nicht negativ sein');
  }
  
  if (data.siege + data.unentschieden + data.niederlagen !== data.spiele_gesamt) {
    errors.push('Siege + Unentschieden + Niederlagen muss gleich Spiele gesamt sein');
  }
  
  if (data.tore_fuer - data.tore_gegen !== data.tordifferenz) {
    errors.push('Tordifferenz stimmt nicht mit Toren überein');
  }
  
  if (!Array.isArray(data.form_letzte_5) || data.form_letzte_5.length > 5) {
    errors.push('Form der letzten 5 Spiele muss ein Array mit maximal 5 Elementen sein');
  }
  
  // Prüfe Form-Array Werte
  const validFormValues = ['S', 'U', 'N'];
  for (const form of data.form_letzte_5) {
    if (!validFormValues.includes(form)) {
      errors.push(`Ungültiger Form-Wert: ${form}. Erlaubt sind: S, U, N`);
    }
  }
  
  return errors;
}

/**
 * Hauptfunktion zum Seeding der Mannschaften
 */
async function seedMannschaften() {
  console.log('🌱 Starte Mannschaften-Seeding...');
  
  // Prüfe Strapi-Verbindung
  if (!(await checkStrapiConnection())) {
    return false;
  }
  
  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const mannschaftData of mannschaftenData) {
    console.log(`\n📋 Verarbeite Mannschaft: ${mannschaftData.name}`);
    
    // Validiere Daten
    const validationErrors = validateMannschaftData(mannschaftData);
    if (validationErrors.length > 0) {
      console.error(`❌ Validierungsfehler für "${mannschaftData.name}":`);
      validationErrors.forEach(error => console.error(`   - ${error}`));
      errorCount++;
      continue;
    }
    
    // Prüfe ob bereits vorhanden
    if (await mannschaftExists(mannschaftData.name)) {
      console.log(`⏭️  Mannschaft "${mannschaftData.name}" bereits vorhanden`);
      skippedCount++;
      continue;
    }
    
    // Erstelle Mannschaft
    const created = await createMannschaft(mannschaftData);
    if (created) {
      createdCount++;
    } else {
      errorCount++;
    }
  }
  
  // Zusammenfassung
  console.log('\n📊 Seeding-Zusammenfassung:');
  console.log(`✅ Erstellt: ${createdCount}`);
  console.log(`⏭️  Übersprungen: ${skippedCount}`);
  console.log(`❌ Fehler: ${errorCount}`);
  console.log(`📋 Gesamt verarbeitet: ${mannschaftenData.length}`);
  
  if (errorCount === 0) {
    console.log('🎉 Mannschaften-Seeding erfolgreich abgeschlossen!');
    return true;
  } else {
    console.log('⚠️  Mannschaften-Seeding mit Fehlern abgeschlossen');
    return false;
  }
}

/**
 * Hilfsfunktion zum Abrufen aller Mannschaften (für Tests)
 */
async function getAllMannschaften() {
  try {
    const response = await axios.get(`${STRAPI_URL}/api/mannschaften`);
    return response.data.data;
  } catch (error) {
    console.error('Fehler beim Abrufen der Mannschaften:', error.message);
    return [];
  }
}

/**
 * Hilfsfunktion zum Löschen aller Mannschaften (für Tests)
 */
async function deleteAllMannschaften() {
  try {
    const mannschaften = await getAllMannschaften();
    
    for (const mannschaft of mannschaften) {
      await axios.delete(`${STRAPI_URL}/api/mannschaften/${mannschaft.id}`);
      console.log(`🗑️  Mannschaft "${mannschaft.attributes.name}" gelöscht`);
    }
    
    console.log(`✅ ${mannschaften.length} Mannschaften gelöscht`);
    return true;
  } catch (error) {
    console.error('Fehler beim Löschen der Mannschaften:', error.message);
    return false;
  }
}

// Export für Tests und andere Scripts
module.exports = {
  seedMannschaften,
  getAllMannschaften,
  deleteAllMannschaften,
  mannschaftenData,
  validateMannschaftData,
  checkStrapiConnection
};

// Script direkt ausführen, wenn es als Hauptmodul aufgerufen wird
if (require.main === module) {
  seedMannschaften();
}