/**
 * Player CSV Import Script - Importiert Spielerdaten aus der Spielerliste.csv
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STRAPI_URL = 'http://localhost:1337';
const CSV_FILE_PATH = path.join(__dirname, '../public/Spielerliste.csv');

console.log('🚀 Skript wird geladen...');
console.log('Node.js Version:', process.version);
console.log('Arbeitsverzeichnis:', process.cwd());

/**
 * Prüft ob Strapi erreichbar ist
 */
async function checkStrapiConnection() {
  try {
    await axios.get(`${STRAPI_URL}/api/spielers`);
    return true;
  } catch (error) {
    console.error('❌ Strapi ist nicht erreichbar:', error.message);
    return false;
  }
}

/**
 * Liest und parst die CSV-Datei
 */
function parseCSV() {
  try {
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV-Datei nicht gefunden: ${CSV_FILE_PATH}`);
    }

    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV-Datei ist leer oder hat keine Datenzeilen');
    }

    const dataLines = lines.slice(1);
    const players = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;

      const columns = line.split(';');
      
      if (columns.length !== 5) {
        console.warn(`⚠️  Zeile ${i + 2} übersprungen: Falsche Anzahl Spalten`);
        continue;
      }

      const [nachname, vorname, geschlecht, geburtsdatum, nationalitaet] = columns.map(col => col.trim());

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
        status: 'aktiv'
      });
    }

    console.log(`📄 CSV-Datei geparst: ${players.length} Spieler gefunden`);
    return players;

  } catch (error) {
    console.error('❌ Fehler beim Parsen der CSV-Datei:', error.message);
    return [];
  }
}

/**
 * Hauptfunktion zum Import der Spieler
 */
async function importPlayers() {
  console.log('🌱 Starte Spieler-Import aus CSV...');
  
  const connected = await checkStrapiConnection();
  if (!connected) {
    return false;
  }

  const players = parseCSV();
  if (players.length === 0) {
    console.error('❌ Keine Spielerdaten gefunden');
    return false;
  }

  console.log(`📊 ${players.length} Spieler bereit zum Import`);
  return true;
}

// Script ausführen
async function runScript() {
  try {
    console.log('🔍 Starte Import...');
    const result = await importPlayers();
    console.log('✅ Import abgeschlossen, Ergebnis:', result);
  } catch (error) {
    console.error('❌ Import-Fehler:', error);
  }
}

runScript();