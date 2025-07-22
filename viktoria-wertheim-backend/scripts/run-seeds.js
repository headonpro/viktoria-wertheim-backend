/**
 * Seed-Script Runner - fügt Basis-Daten über HTTP-API ein
 */

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';

const kategorien = [
  { name: 'Vereinsnews', beschreibung: 'Allgemeine Vereinsnachrichten', farbe: '#3B82F6', reihenfolge: 1 },
  { name: 'Spielberichte', beschreibung: 'Berichte von Spielen', farbe: '#EF4444', reihenfolge: 2 },
  { name: 'Training', beschreibung: 'Training und Übungen', farbe: '#10B981', reihenfolge: 3 },
  { name: 'Transfers', beschreibung: 'Neue Spieler und Abgänge', farbe: '#F59E0B', reihenfolge: 4 },
  { name: 'Events', beschreibung: 'Vereinsveranstaltungen', farbe: '#8B5CF6', reihenfolge: 5 },
];

async function seedKategorien() {
  console.log('🌱 Seeding Kategorien via API...');
  
  try {
    // Prüfe ob Strapi läuft
    await axios.get(`${STRAPI_URL}/api/kategorien`);
    
    for (const kategorie of kategorien) {
      try {
        // Prüfe ob Kategorie bereits existiert
        const response = await axios.get(`${STRAPI_URL}/api/kategorien`, {
          params: {
            filters: {
              name: kategorie.name
            }
          }
        });

        if (response.data.data.length === 0) {
          // Kategorie erstellen
          await axios.post(`${STRAPI_URL}/api/kategorien`, {
            data: kategorie
          });
          console.log(`✅ Kategorie "${kategorie.name}" erstellt`);
        } else {
          console.log(`⏭️  Kategorie "${kategorie.name}" bereits vorhanden`);
        }
      } catch (error) {
        console.error(`❌ Fehler beim Erstellen der Kategorie "${kategorie.name}":`, error.response?.data || error.message);
      }
    }
    
    console.log('✅ Kategorien-Seeding abgeschlossen');
  } catch (error) {
    console.error('❌ Strapi ist nicht erreichbar. Stellen Sie sicher, dass Strapi läuft:', error.message);
  }
}

async function seedSponsors() {
  console.log('🌱 Seeding Sponsors via API...');
  
  const sponsorsData = [
    {
      name: 'Sparkasse Tauberfranken',
      website_url: 'https://www.sparkasse-tauberfranken.de',
      beschreibung: 'Unser langjähriger Hauptsponsor und Partner für alle finanziellen Angelegenheiten.',
      kategorie: 'hauptsponsor',
      reihenfolge: 1,
      aktiv: true
    },
    {
      name: 'Autohaus Müller Wertheim',
      website_url: 'https://www.autohaus-mueller-wertheim.de',
      beschreibung: 'Premium Partner für Mobilität und Fahrzeuge.',
      kategorie: 'premium',
      reihenfolge: 2,
      aktiv: true
    },
    {
      name: 'Physiotherapie Wertheim',
      website_url: 'https://www.physio-wertheim.de',
      beschreibung: 'Professionelle medizinische Betreuung unserer Sportler.',
      kategorie: 'premium',
      reihenfolge: 3,
      aktiv: true
    },
    {
      name: 'Bäckerei Schmidt',
      website_url: 'https://www.baeckerei-schmidt.de',
      beschreibung: 'Frische Backwaren für unsere Vereinsfeste.',
      kategorie: 'partner',
      reihenfolge: 4,
      aktiv: true
    },
    {
      name: 'Getränke Weber',
      website_url: 'https://www.getraenke-weber.de',
      beschreibung: 'Erfrischende Getränke für Spieler und Fans.',
      kategorie: 'partner',
      reihenfolge: 5,
      aktiv: true
    },
    {
      name: 'Elektro Hoffmann',
      website_url: 'https://www.elektro-hoffmann.de',
      beschreibung: 'Zuverlässige Elektroinstallationen.',
      kategorie: 'partner',
      reihenfolge: 6,
      aktiv: true
    }
  ];

  try {
    // Prüfe ob Sponsors bereits existieren
    const response = await axios.get(`${STRAPI_URL}/api/sponsors`);
    
    if (response.data.data.length === 0) {
      for (const sponsorData of sponsorsData) {
        try {
          await axios.post(`${STRAPI_URL}/api/sponsors`, {
            data: sponsorData
          });
          console.log(`✅ Sponsor "${sponsorData.name}" erstellt`);
        } catch (error) {
          console.error(`❌ Fehler beim Erstellen des Sponsors "${sponsorData.name}":`, error.response?.data || error.message);
        }
      }
    } else {
      console.log('⏭️  Sponsors bereits vorhanden');
    }
    
    console.log('✅ Sponsors-Seeding abgeschlossen');
  } catch (error) {
    console.error('❌ Fehler beim Sponsors-Seeding:', error.response?.data || error.message);
  }
}

// Import der neuen Seeding-Funktionen
const { seedMannschaften } = require('./seed-mannschaften');
const { seedSpiele } = require('./seed-spiele');

async function runAllSeeds() {
  console.log('🌱 Starte vollständiges Seeding...\n');
  
  try {
    // 1. Kategorien seeden (für News)
    console.log('📋 Phase 1: Kategorien');
    await seedKategorien();
    
    // 2. Sponsors seeden
    console.log('\n💰 Phase 2: Sponsors');
    await seedSponsors();
    
    // 3. Mannschaften seeden (muss vor Spielen erfolgen)
    console.log('\n⚽ Phase 3: Mannschaften');
    const mannschaftenSuccess = await seedMannschaften();
    
    if (!mannschaftenSuccess) {
      console.error('❌ Mannschaften-Seeding fehlgeschlagen. Spiele-Seeding wird übersprungen.');
      return false;
    }
    
    // 4. Spiele seeden (benötigt Mannschaften)
    console.log('\n🏆 Phase 4: Spiele');
    const spieleSuccess = await seedSpiele();
    
    if (!spieleSuccess) {
      console.error('❌ Spiele-Seeding fehlgeschlagen.');
      return false;
    }
    
    console.log('\n🎉 Vollständiges Seeding erfolgreich abgeschlossen!');
    console.log('📊 Zusammenfassung:');
    console.log('   ✅ Kategorien erstellt');
    console.log('   ✅ Sponsors erstellt');
    console.log('   ✅ Mannschaften erstellt');
    console.log('   ✅ Spiele erstellt');
    
    return true;
    
  } catch (error) {
    console.error('❌ Fehler beim Seeding:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Hilfsfunktion zum Seeding einzelner Bereiche
async function runSpecificSeed(type) {
  console.log(`🌱 Starte ${type}-Seeding...\n`);
  
  try {
    switch (type.toLowerCase()) {
      case 'kategorien':
        return await seedKategorien();
      
      case 'sponsors':
        return await seedSponsors();
      
      case 'mannschaften':
      case 'teams':
        return await seedMannschaften();
      
      case 'spiele':
      case 'games':
        return await seedSpiele();
      
      default:
        console.error(`❌ Unbekannter Seeding-Typ: ${type}`);
        console.log('Verfügbare Typen: kategorien, sponsors, mannschaften, spiele');
        return false;
    }
  } catch (error) {
    console.error(`❌ Fehler beim ${type}-Seeding:`, error.message);
    return false;
  }
}

// Command-line Interface
const args = process.argv.slice(2);

if (args.length > 0) {
  const seedType = args[0];
  runSpecificSeed(seedType);
} else {
  // Script ausführen
  runAllSeeds();
} 