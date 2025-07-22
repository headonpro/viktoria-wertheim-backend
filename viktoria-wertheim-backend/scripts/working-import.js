/**
 * Funktionierendes Spieler-Import-Skript
 */

console.log('🚀 Spieler-Import startet...');

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STRAPI_URL = 'http://localhost:1337';
const CSV_FILE_PATH = path.join(__dirname, '../public/Spielerliste.csv');

/**
 * CSV-Datei parsen
 */
function parseCSV() {
  console.log('📄 Parse CSV-Datei...');
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error('❌ CSV-Datei nicht gefunden:', CSV_FILE_PATH);
    return [];
  }

  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length < 2) {
    console.error('❌ CSV-Datei hat keine Datenzeilen');
    return [];
  }

  const players = [];
  const dataLines = lines.slice(1); // Header überspringen

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const columns = line.split(';').map(col => col.trim().replace(/\r$/, ''));
    
    if (columns.length !== 5) {
      console.warn(`⚠️  Zeile ${i + 2} übersprungen: ${columns.length} Spalten statt 5`);
      continue;
    }

    const [nachname, vorname, geschlecht, geburtsdatum, nationalitaet] = columns;

    if (!nachname || !vorname) {
      console.warn(`⚠️  Zeile ${i + 2} übersprungen: Name fehlt`);
      continue;
    }

    players.push({
      nachname,
      vorname,
      geschlecht: geschlecht.toLowerCase(),
      geburtsdatum,
      nationalitaet,
      position: 'mittelfeld',
      tore_saison: 0,
      spiele_saison: 0,
      gelbe_karten: 0,
      rote_karten: 0,
      status: 'aktiv',
      assists: 0,
      einsatzminuten: 0
    });
  }

  console.log(`✅ ${players.length} Spieler aus CSV gelesen`);
  return players;
}

/**
 * Strapi-Verbindung testen
 */
async function testConnection() {
  console.log('🔗 Teste Strapi-Verbindung...');
  
  try {
    const response = await axios.get(`${STRAPI_URL}/api/spielers`);
    console.log('✅ Strapi-Verbindung erfolgreich');
    return true;
  } catch (error) {
    console.error('❌ Strapi-Verbindung fehlgeschlagen:', error.message);
    return false;
  }
}

/**
 * Spieler erstellen (vereinfacht)
 */
async function createPlayer(playerData) {
  try {
    const response = await axios.post(`${STRAPI_URL}/api/spielers`, {
      data: playerData
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen von ${playerData.vorname} ${playerData.nachname}:`, 
      error.response?.data?.error?.message || error.message);
    return null;
  }
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log('🌱 Starte Spieler-Import...');

  // 1. Verbindung testen
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Import abgebrochen - keine Strapi-Verbindung');
    return;
  }

  // 2. CSV parsen
  const players = parseCSV();
  if (players.length === 0) {
    console.error('❌ Import abgebrochen - keine Spielerdaten');
    return;
  }

  // 3. Ersten Spieler als Test erstellen
  console.log('👤 Teste Import mit erstem Spieler...');
  const firstPlayer = players[0];
  console.log('Test-Spieler:', `${firstPlayer.vorname} ${firstPlayer.nachname}`);
  
  const created = await createPlayer(firstPlayer);
  if (created) {
    console.log('✅ Test-Spieler erfolgreich erstellt!');
    console.log('📊 Bereit für vollständigen Import von', players.length, 'Spielern');
  } else {
    console.error('❌ Test-Spieler konnte nicht erstellt werden');
  }
}

// Skript ausführen
main().catch(error => {
  console.error('❌ Unerwarteter Fehler:', error);
});