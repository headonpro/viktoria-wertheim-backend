/**
 * Vereinfachtes Spieler-Import-Skript
 * Verwendet nur die verfügbaren Felder im Spieler-Schema
 */

console.log('🚀 Vereinfachter Spieler-Import startet...');

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

    // Nur die Felder verwenden, die im Spieler-Schema existieren
    players.push({
      position: 'mittelfeld', // Standard-Position
      tore_saison: 0,
      spiele_saison: 0,
      gelbe_karten: 0,
      rote_karten: 0,
      status: 'aktiv',
      assists: 0,
      einsatzminuten: 0,
      // Zusätzliche Felder als Kommentar für später
      // Diese werden nicht importiert, da sie nicht im Schema sind:
      // vorname, nachname, geschlecht, geburtsdatum, nationalitaet
    });
  }

  console.log(`✅ ${players.length} Spieler aus CSV gelesen`);
  return players;
}

/**
 * Spieler erstellen
 */
async function createPlayer(playerData, index) {
  try {
    const response = await axios.post(`${STRAPI_URL}/api/spielers`, {
      data: playerData
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen von Spieler ${index + 1}:`, 
      error.response?.data?.error?.message || error.message);
    return null;
  }
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log('🌱 Starte vereinfachten Spieler-Import...');

  // 1. Verbindung testen
  try {
    await axios.get(`${STRAPI_URL}/api/spielers`);
    console.log('✅ Strapi-Verbindung erfolgreich');
  } catch (error) {
    console.error('❌ Strapi-Verbindung fehlgeschlagen:', error.message);
    return;
  }

  // 2. CSV parsen
  const players = parseCSV();
  if (players.length === 0) {
    console.error('❌ Import abgebrochen - keine Spielerdaten');
    return;
  }

  // 3. Alle Spieler importieren
  console.log(`👥 Importiere ${players.length} Spieler...`);
  
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < players.length; i++) {
    const playerData = players[i];
    console.log(`👤 Erstelle Spieler ${i + 1}/${players.length}...`);
    
    const created = await createPlayer(playerData, i);
    if (created) {
      successCount++;
      console.log(`✅ Spieler ${i + 1} erstellt (ID: ${created.id})`);
    } else {
      errorCount++;
    }

    // Kurze Pause zwischen Requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Zusammenfassung
  console.log('\n📊 Import-Zusammenfassung:');
  console.log(`✅ Erfolgreich erstellt: ${successCount}`);
  console.log(`❌ Fehler: ${errorCount}`);
  console.log(`📋 Gesamt verarbeitet: ${players.length}`);

  if (successCount > 0) {
    console.log('\n🎉 Spieler-Import erfolgreich abgeschlossen!');
    console.log('💡 Die Spieler wurden mit Standard-Werten erstellt.');
    console.log('💡 Du kannst sie später in Strapi bearbeiten und die Namen hinzufügen.');
  }
}

// Skript ausführen
main().catch(error => {
  console.error('❌ Unerwarteter Fehler:', error);
});