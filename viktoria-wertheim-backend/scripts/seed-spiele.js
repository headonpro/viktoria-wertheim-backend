/**
 * Spiele Seeding Script - Erstellt realistische Spieldaten für alle drei Mannschaften
 */

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';

// Gegnermannschaften für jede Liga
const gegnermannschaften = {
  'Kreisliga': [
    'FC Tauberbischofsheim',
    'SV Königshofen',
    'TSV Lauda',
    'FC Grünsfeld',
    'SV Distelhausen',
    'TSG Külsheim',
    'FC Werbach',
    'SV Impfingen',
    'TSV Assamstadt',
    'FC Boxberg',
    'SV Wittighausen',
    'TSV Reicholzheim',
    'FC Freudenberg',
    'SV Eubigheim'
  ],
  'Kreisklasse A': [
    'SV Nassig',
    'FC Dertingen',
    'TSV Mondfeld',
    'SV Höhefeld',
    'FC Uissigheim',
    'TSV Gamburg',
    'SV Kembach',
    'FC Sachsenflur',
    'TSV Urphar',
    'SV Bettingen',
    'FC Dörlesberg',
    'TSV Kreuzwertheim',
    'SV Hasloch',
    'FC Eichel'
  ],
  'Kreisklasse B': [
    'SV Lindelbach',
    'FC Dittwar',
    'TSV Gerchsheim',
    'SV Oberlauda',
    'FC Beckstein',
    'TSV Bobstadt',
    'SV Gerlachsheim',
    'FC Heckfeld',
    'TSV Königheim',
    'SV Messelhausen',
    'FC Oberbalbach',
    'TSV Sonderriet',
    'SV Unterbalbach',
    'FC Vilchband'
  ]
};

// Schiedsrichter-Pool
const schiedsrichter = [
  'Hans Müller',
  'Peter Schmidt',
  'Klaus Weber',
  'Michael Fischer',
  'Thomas Wagner',
  'Andreas Becker',
  'Stefan Schulz',
  'Markus Hoffmann',
  'Christian Koch',
  'Daniel Richter',
  'Frank Neumann',
  'Jürgen Schwarz',
  'Ralf Zimmermann',
  'Uwe Braun',
  'Wolfgang Hartmann'
];

// Spielernamen für Torschützen und Karten
const spielernamen = {
  'SV Viktoria Wertheim I': [
    'Max Mustermann', 'Tim Weber', 'Jan Schmidt', 'Lukas Müller', 'Felix Koch',
    'David Wagner', 'Simon Fischer', 'Tobias Becker', 'Florian Schulz', 'Marco Hoffmann',
    'Kevin Richter', 'Dennis Neumann', 'Patrick Schwarz', 'Alexander Zimmermann'
  ],
  'SV Viktoria Wertheim II': [
    'Leon Braun', 'Nico Hartmann', 'Jonas Klein', 'Philipp Wolf', 'Dominik Krüger',
    'Sebastian Lange', 'Fabian Schmitt', 'Marcel Günther', 'Robin Vogel', 'Steffen Baumann',
    'Benjamin Sommer', 'Matthias Winter', 'Christopher Krause', 'Julian Stein'
  ],
  'SV Viktoria Wertheim III': [
    'Oliver Berg', 'Sascha Horn', 'Rene Fuchs', 'Mario Engel', 'Carsten Roth',
    'Thorsten Keller', 'Jens Huber', 'Andreas Weiß', 'Bernd Scholz', 'Holger Frank',
    'Dirk Lorenz', 'Sven Groß', 'Ralph Hahn', 'Kai Schreiber'
  ]
};

/**
 * Generiert zufällige Torschützen für ein Spiel
 */
function generateTorschuetzen(heimTore, auswaertsTore, heimTeam, auswaertsTeam) {
  const torschuetzen = [];
  
  // Heim-Tore
  for (let i = 0; i < heimTore; i++) {
    const minute = Math.floor(Math.random() * 90) + 1;
    const spieler = spielernamen[heimTeam] ? 
      spielernamen[heimTeam][Math.floor(Math.random() * spielernamen[heimTeam].length)] :
      'Unbekannter Spieler';
    
    torschuetzen.push({
      minute: minute,
      player: spieler,
      team: 'home'
    });
  }
  
  // Auswärts-Tore
  for (let i = 0; i < auswaertsTore; i++) {
    const minute = Math.floor(Math.random() * 90) + 1;
    const spieler = spielernamen[auswaertsTeam] ? 
      spielernamen[auswaertsTeam][Math.floor(Math.random() * spielernamen[auswaertsTeam].length)] :
      'Unbekannter Spieler';
    
    torschuetzen.push({
      minute: minute,
      player: spieler,
      team: 'away'
    });
  }
  
  // Nach Minute sortieren
  return torschuetzen.sort((a, b) => a.minute - b.minute);
}

/**
 * Generiert zufällige Karten für ein Spiel
 */
function generateKarten(heimTeam, auswaertsTeam) {
  const gelbeKarten = [];
  const roteKarten = [];
  
  // 0-4 gelbe Karten pro Spiel
  const anzahlGelb = Math.floor(Math.random() * 5);
  for (let i = 0; i < anzahlGelb; i++) {
    const isHeim = Math.random() < 0.5;
    const teamName = isHeim ? heimTeam : auswaertsTeam;
    const minute = Math.floor(Math.random() * 90) + 1;
    const spieler = spielernamen[teamName] ? 
      spielernamen[teamName][Math.floor(Math.random() * spielernamen[teamName].length)] :
      'Unbekannter Spieler';
    
    gelbeKarten.push({
      minute: minute,
      player: spieler,
      team: isHeim ? 'home' : 'away'
    });
  }
  
  // 0-1 rote Karten pro Spiel (selten)
  if (Math.random() < 0.1) { // 10% Chance auf rote Karte
    const isHeim = Math.random() < 0.5;
    const teamName = isHeim ? heimTeam : auswaertsTeam;
    const minute = Math.floor(Math.random() * 90) + 1;
    const spieler = spielernamen[teamName] ? 
      spielernamen[teamName][Math.floor(Math.random() * spielernamen[teamName].length)] :
      'Unbekannter Spieler';
    
    roteKarten.push({
      minute: minute,
      player: spieler,
      team: isHeim ? 'home' : 'away'
    });
  }
  
  return {
    gelbe_karten: gelbeKarten.sort((a, b) => a.minute - b.minute),
    rote_karten: roteKarten.sort((a, b) => a.minute - b.minute)
  };
}

/**
 * Generiert Informationen zum letzten Aufeinandertreffen
 */
function generateLetztesAufeinandertreffen(heimTeam, auswaertsTeam) {
  // Nur für zukünftige Spiele
  const ergebnisse = ['1:0', '2:1', '0:2', '1:1', '3:0', '0:1', '2:2', '1:3'];
  const orte = ['heim', 'auswaerts'];
  
  const datum = new Date();
  datum.setMonth(datum.getMonth() - Math.floor(Math.random() * 12) - 1); // 1-12 Monate zurück
  
  return {
    date: datum.toISOString().split('T')[0],
    result: ergebnisse[Math.floor(Math.random() * ergebnisse.length)],
    location: orte[Math.floor(Math.random() * orte.length)]
  };
}

/**
 * Erstellt Spieldaten für eine Mannschaft
 */
function createSpieleForMannschaft(mannschaftName, liga, spieltag = 1) {
  const spiele = [];
  const gegner = gegnermannschaften[liga];
  const heute = new Date();
  
  // 5 vergangene Spiele
  for (let i = 5; i >= 1; i--) {
    const datum = new Date(heute);
    datum.setDate(datum.getDate() - (i * 7)); // Wöchentlich
    
    const gegnerName = gegner[Math.floor(Math.random() * gegner.length)];
    const isHeim = Math.random() < 0.5;
    
    // Realistische Ergebnisse
    const heimTore = Math.floor(Math.random() * 4);
    const auswaertsTore = Math.floor(Math.random() * 4);
    
    const heimTeam = isHeim ? mannschaftName : gegnerName;
    const auswaertsTeam = isHeim ? gegnerName : mannschaftName;
    
    const torschuetzen = generateTorschuetzen(heimTore, auswaertsTore, heimTeam, auswaertsTeam);
    const karten = generateKarten(heimTeam, auswaertsTeam);
    
    spiele.push({
      datum: datum.toISOString(),
      heimmannschaft: heimTeam,
      auswaertsmannschaft: auswaertsTeam,
      tore_heim: heimTore,
      tore_auswaerts: auswaertsTore,
      spielort: isHeim ? 'Sportplatz Wertheim' : `Sportplatz ${gegnerName}`,
      liga: liga,
      spieltag: spieltag + (5 - i),
      saison: '2024/25',
      status: 'beendet',
      schiedsrichter: schiedsrichter[Math.floor(Math.random() * schiedsrichter.length)],
      zuschauer: Math.floor(Math.random() * 200) + 50,
      wetter: ['sonnig', 'bewoelkt', 'regen'][Math.floor(Math.random() * 3)],
      torschuetzen: torschuetzen,
      gelbe_karten: karten.gelbe_karten,
      rote_karten: karten.rote_karten,
      spielbericht: `Spannendes Spiel zwischen ${heimTeam} und ${auswaertsTeam}. Das Spiel endete ${heimTore}:${auswaertsTore}.`
    });
  }
  
  // 3 zukünftige Spiele
  for (let i = 1; i <= 3; i++) {
    const datum = new Date(heute);
    datum.setDate(datum.getDate() + (i * 7)); // Wöchentlich
    
    const gegnerName = gegner[Math.floor(Math.random() * gegner.length)];
    const isHeim = Math.random() < 0.5;
    
    const heimTeam = isHeim ? mannschaftName : gegnerName;
    const auswaertsTeam = isHeim ? gegnerName : mannschaftName;
    
    spiele.push({
      datum: datum.toISOString(),
      heimmannschaft: heimTeam,
      auswaertsmannschaft: auswaertsTeam,
      tore_heim: null,
      tore_auswaerts: null,
      spielort: isHeim ? 'Sportplatz Wertheim' : `Sportplatz ${gegnerName}`,
      liga: liga,
      spieltag: spieltag + 5 + i,
      saison: '2024/25',
      status: 'geplant',
      schiedsrichter: schiedsrichter[Math.floor(Math.random() * schiedsrichter.length)],
      zuschauer: null,
      wetter: null,
      torschuetzen: [],
      gelbe_karten: [],
      rote_karten: [],
      letztes_aufeinandertreffen: generateLetztesAufeinandertreffen(heimTeam, auswaertsTeam),
      spielbericht: null
    });
  }
  
  return spiele;
}

// Alle Spieldaten
const alleSpiele = [
  ...createSpieleForMannschaft('SV Viktoria Wertheim I', 'Kreisliga', 1),
  ...createSpieleForMannschaft('SV Viktoria Wertheim II', 'Kreisklasse A', 1),
  ...createSpieleForMannschaft('SV Viktoria Wertheim III', 'Kreisklasse B', 1)
];

/**
 * Prüft ob Strapi erreichbar ist
 */
async function checkStrapiConnection() {
  try {
    await axios.get(`${STRAPI_URL}/api/spiele`);
    return true;
  } catch (error) {
    console.error('❌ Strapi ist nicht erreichbar. Stellen Sie sicher, dass Strapi läuft:', error.message);
    return false;
  }
}

/**
 * Holt Mannschafts-IDs für Relationen
 */
async function getMannschaftIds() {
  try {
    const response = await axios.get(`${STRAPI_URL}/api/mannschaften`);
    const mannschaften = response.data.data;
    
    const idMap = {};
    mannschaften.forEach(mannschaft => {
      idMap[mannschaft.attributes.name] = mannschaft.id;
    });
    
    return idMap;
  } catch (error) {
    console.error('Fehler beim Abrufen der Mannschaften:', error.message);
    return {};
  }
}

/**
 * Prüft ob ein Spiel bereits existiert
 */
async function spielExists(datum, heimmannschaft, auswaertsmannschaft) {
  try {
    const response = await axios.get(`${STRAPI_URL}/api/spiele`, {
      params: {
        filters: {
          datum: datum,
          heimmannschaft: heimmannschaft,
          auswaertsmannschaft: auswaertsmannschaft
        }
      }
    });
    return response.data.data.length > 0;
  } catch (error) {
    console.error('Fehler beim Prüfen des Spiels:', error.message);
    return false;
  }
}

/**
 * Erstellt ein einzelnes Spiel
 */
async function createSpiel(spielData, mannschaftIds) {
  try {
    // Konvertiere Mannschaftsnamen zu IDs
    const heimId = mannschaftIds[spielData.heimmannschaft];
    const auswaertsId = mannschaftIds[spielData.auswaertsmannschaft];
    
    if (!heimId && spielData.heimmannschaft.includes('Viktoria')) {
      console.warn(`⚠️  Heim-Mannschaft "${spielData.heimmannschaft}" nicht gefunden`);
      return null;
    }
    if (!auswaertsId && spielData.auswaertsmannschaft.includes('Viktoria')) {
      console.warn(`⚠️  Auswärts-Mannschaft "${spielData.auswaertsmannschaft}" nicht gefunden`);
      return null;
    }
    
    const spielDataForApi = {
      ...spielData,
      heimmannschaft: heimId || null,
      auswaertsmannschaft: auswaertsId || null
    };
    
    const response = await axios.post(`${STRAPI_URL}/api/spiele`, {
      data: spielDataForApi
    });
    
    if (response.data && response.data.data) {
      console.log(`✅ Spiel "${spielData.heimmannschaft} vs ${spielData.auswaertsmannschaft}" erstellt (ID: ${response.data.data.id})`);
      return response.data.data;
    } else {
      console.error(`❌ Unerwartete Antwort beim Erstellen des Spiels`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen des Spiels "${spielData.heimmannschaft} vs ${spielData.auswaertsmannschaft}":`, 
      error.response?.data?.error?.message || error.message);
    return null;
  }
}

/**
 * Validiert Spieldaten
 */
function validateSpielData(data) {
  const errors = [];
  
  if (!data.datum) {
    errors.push('Datum ist erforderlich');
  }
  
  if (!data.heimmannschaft || !data.auswaertsmannschaft) {
    errors.push('Heim- und Auswärtsmannschaft sind erforderlich');
  }
  
  if (data.heimmannschaft === data.auswaertsmannschaft) {
    errors.push('Heim- und Auswärtsmannschaft können nicht identisch sein');
  }
  
  if (data.status === 'beendet' && (data.tore_heim === null || data.tore_auswaerts === null)) {
    errors.push('Beendete Spiele müssen ein Ergebnis haben');
  }
  
  if (data.tore_heim !== null && data.tore_heim < 0) {
    errors.push('Heim-Tore können nicht negativ sein');
  }
  
  if (data.tore_auswaerts !== null && data.tore_auswaerts < 0) {
    errors.push('Auswärts-Tore können nicht negativ sein');
  }
  
  return errors;
}

/**
 * Hauptfunktion zum Seeding der Spiele
 */
async function seedSpiele() {
  console.log('🌱 Starte Spiele-Seeding...');
  
  // Prüfe Strapi-Verbindung
  if (!(await checkStrapiConnection())) {
    return false;
  }
  
  // Hole Mannschafts-IDs
  console.log('📋 Lade Mannschafts-IDs...');
  const mannschaftIds = await getMannschaftIds();
  
  if (Object.keys(mannschaftIds).length === 0) {
    console.error('❌ Keine Mannschaften gefunden. Führen Sie zuerst das Mannschaften-Seeding aus.');
    return false;
  }
  
  console.log(`✅ ${Object.keys(mannschaftIds).length} Mannschaften gefunden`);
  
  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const spielData of alleSpiele) {
    console.log(`\n⚽ Verarbeite Spiel: ${spielData.heimmannschaft} vs ${spielData.auswaertsmannschaft} (${spielData.datum.split('T')[0]})`);
    
    // Validiere Daten
    const validationErrors = validateSpielData(spielData);
    if (validationErrors.length > 0) {
      console.error(`❌ Validierungsfehler:`);
      validationErrors.forEach(error => console.error(`   - ${error}`));
      errorCount++;
      continue;
    }
    
    // Prüfe ob bereits vorhanden (vereinfacht)
    const heimId = mannschaftIds[spielData.heimmannschaft];
    const auswaertsId = mannschaftIds[spielData.auswaertsmannschaft];
    
    if (await spielExists(spielData.datum, heimId, auswaertsId)) {
      console.log(`⏭️  Spiel bereits vorhanden`);
      skippedCount++;
      continue;
    }
    
    // Erstelle Spiel
    const created = await createSpiel(spielData, mannschaftIds);
    if (created) {
      createdCount++;
    } else {
      errorCount++;
    }
  }
  
  // Zusammenfassung
  console.log('\n📊 Spiele-Seeding-Zusammenfassung:');
  console.log(`✅ Erstellt: ${createdCount}`);
  console.log(`⏭️  Übersprungen: ${skippedCount}`);
  console.log(`❌ Fehler: ${errorCount}`);
  console.log(`⚽ Gesamt verarbeitet: ${alleSpiele.length}`);
  
  if (errorCount === 0) {
    console.log('🎉 Spiele-Seeding erfolgreich abgeschlossen!');
    return true;
  } else {
    console.log('⚠️  Spiele-Seeding mit Fehlern abgeschlossen');
    return false;
  }
}

/**
 * Hilfsfunktion zum Abrufen aller Spiele (für Tests)
 */
async function getAllSpiele() {
  try {
    const response = await axios.get(`${STRAPI_URL}/api/spiele?populate=*`);
    return response.data.data;
  } catch (error) {
    console.error('Fehler beim Abrufen der Spiele:', error.message);
    return [];
  }
}

/**
 * Hilfsfunktion zum Löschen aller Spiele (für Tests)
 */
async function deleteAllSpiele() {
  try {
    const spiele = await getAllSpiele();
    
    for (const spiel of spiele) {
      await axios.delete(`${STRAPI_URL}/api/spiele/${spiel.id}`);
      console.log(`🗑️  Spiel ID ${spiel.id} gelöscht`);
    }
    
    console.log(`✅ ${spiele.length} Spiele gelöscht`);
    return true;
  } catch (error) {
    console.error('Fehler beim Löschen der Spiele:', error.message);
    return false;
  }
}

// Export für Tests und andere Scripts
module.exports = {
  seedSpiele,
  getAllSpiele,
  deleteAllSpiele,
  alleSpiele,
  validateSpielData,
  checkStrapiConnection,
  getMannschaftIds,
  createSpieleForMannschaft,
  generateTorschuetzen,
  generateKarten,
  generateLetztesAufeinandertreffen
};

// Script direkt ausführen, wenn es als Hauptmodul aufgerufen wird
if (require.main === module) {
  seedSpiele();
}