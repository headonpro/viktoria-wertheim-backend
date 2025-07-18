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

// Script ausführen
seedKategorien(); 