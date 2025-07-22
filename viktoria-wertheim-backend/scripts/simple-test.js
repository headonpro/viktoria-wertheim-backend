/**
 * Einfacher Test für CSV Import
 */

const { parseCSV, checkStrapiConnection } = require('./import-players-csv.js');

async function runTest() {
  console.log('🚀 Starte einfachen Test...');
  
  // Test CSV Parsing
  console.log('\n📄 Teste CSV Parsing...');
  const players = parseCSV();
  console.log(`Gefundene Spieler: ${players.length}`);
  
  if (players.length > 0) {
    console.log('Erster Spieler:', players[0]);
  }
  
  // Test Strapi Connection
  console.log('\n🔗 Teste Strapi Verbindung...');
  const connected = await checkStrapiConnection();
  console.log('Verbindung erfolgreich:', connected);
  
  console.log('\n✅ Test abgeschlossen');
}

runTest();