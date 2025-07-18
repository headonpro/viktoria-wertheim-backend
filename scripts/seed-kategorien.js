/**
 * Seed-Script für News-Kategorien
 */

const kategorien = [
  { name: 'Vereinsnews', beschreibung: 'Allgemeine Vereinsnachrichten', farbe: '#3B82F6', reihenfolge: 1 },
  { name: 'Spielberichte', beschreibung: 'Berichte von Spielen', farbe: '#EF4444', reihenfolge: 2 },
  { name: 'Training', beschreibung: 'Training und Übungen', farbe: '#10B981', reihenfolge: 3 },
  { name: 'Transfers', beschreibung: 'Neue Spieler und Abgänge', farbe: '#F59E0B', reihenfolge: 4 },
  { name: 'Events', beschreibung: 'Vereinsveranstaltungen', farbe: '#8B5CF6', reihenfolge: 5 },
];

async function seedKategorien() {
  console.log('🌱 Seeding Kategorien...');
  
  for (const kategorie of kategorien) {
    try {
      // Prüfe ob Kategorie bereits existiert
      const existing = await strapi.db.query('api::kategorie.kategorie').findOne({
        where: { name: kategorie.name }
      });

      if (!existing) {
        await strapi.db.query('api::kategorie.kategorie').create({
          data: {
            ...kategorie,
            publishedAt: new Date()
          }
        });
        console.log(`✅ Kategorie "${kategorie.name}" erstellt`);
      } else {
        console.log(`⏭️  Kategorie "${kategorie.name}" bereits vorhanden`);
      }
    } catch (error) {
      console.error(`❌ Fehler beim Erstellen der Kategorie "${kategorie.name}":`, error);
    }
  }
  
  console.log('✅ Kategorien-Seeding abgeschlossen');
}

module.exports = seedKategorien; 