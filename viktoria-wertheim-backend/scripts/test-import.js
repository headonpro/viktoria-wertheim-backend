console.log('🚀 Test-Import-Skript startet...');

const fs = require('fs');
const path = require('path');

const CSV_FILE_PATH = path.join(__dirname, '../public/Spielerliste.csv');

console.log('CSV-Pfad:', CSV_FILE_PATH);
console.log('Datei existiert:', fs.existsSync(CSV_FILE_PATH));

if (fs.existsSync(CSV_FILE_PATH)) {
  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  const lines = content.trim().split('\n');
  console.log('Anzahl Zeilen:', lines.length);
  console.log('Erste Zeile:', lines[0]);
  
  if (lines.length > 1) {
    console.log('Zweite Zeile:', lines[1]);
    
    // Parse erste Datenzeile
    const columns = lines[1].split(';');
    console.log('Spalten:', columns);
    
    if (columns.length === 5) {
      const [nachname, vorname, geschlecht, geburtsdatum, nationalitaet] = columns;
      console.log('Erster Spieler:');
      console.log('- Nachname:', nachname);
      console.log('- Vorname:', vorname);
      console.log('- Geschlecht:', geschlecht);
      console.log('- Geburtsdatum:', geburtsdatum);
      console.log('- Nationalität:', nationalitaet);
    }
  }
}

console.log('✅ Test abgeschlossen');