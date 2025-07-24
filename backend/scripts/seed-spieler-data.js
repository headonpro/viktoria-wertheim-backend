/**
 * Seed-Skript für Viktoria Wertheim Spielerdaten
 * 
 * Dieses Skript:
 * 1. Erweitert das Mitglied-Schema um Nationalität (falls nötig)
 * 2. Erstellt Mitglieder-Einträge mit Grunddaten
 * 3. Erstellt entsprechende Spieler-Einträge
 */

const spielerDaten = [
  { nachname: "Avdullahi", vorname: "Florian", geburtsdatum: "2003-05-19", nationalitaet: "D" },
  { nachname: "Baytekin", vorname: "Umut", geburtsdatum: "1991-05-09", nationalitaet: "TR" },
  { nachname: "Bender", vorname: "Richard", geburtsdatum: "1998-03-03", nationalitaet: "D" },
  { nachname: "Berberich", vorname: "Can", geburtsdatum: "1996-11-15", nationalitaet: "D" },
  { nachname: "Bogdan", vorname: "Nik", geburtsdatum: "2004-10-29", nationalitaet: "HR" },
  { nachname: "Boger", vorname: "Konstantin", geburtsdatum: "1985-06-05", nationalitaet: "D" },
  { nachname: "Böspflug", vorname: "Erik", geburtsdatum: "2000-03-28", nationalitaet: "D" },
  { nachname: "Böspflug", vorname: "Paul", geburtsdatum: "2001-09-23", nationalitaet: "D" },
  { nachname: "Busch", vorname: "Maximilian", geburtsdatum: "1996-10-17", nationalitaet: "D" },
  { nachname: "Cirakoglu", vorname: "Okan", geburtsdatum: "1993-09-02", nationalitaet: "TR" },
  { nachname: "Cirakoglu", vorname: "Ramazan", geburtsdatum: "1995-02-16", nationalitaet: "TR" },
  { nachname: "Devjatkin", vorname: "Arthur", geburtsdatum: "1996-05-08", nationalitaet: "D" },
  { nachname: "Devjatkin", vorname: "Christian", geburtsdatum: "2000-02-29", nationalitaet: "D" },
  { nachname: "Dey", vorname: "Johannes", geburtsdatum: "2000-06-08", nationalitaet: "D" },
  { nachname: "Domi", vorname: "Alberto", geburtsdatum: "1998-03-16", nationalitaet: "I" },
  { nachname: "Eckhardt", vorname: "Marcel", geburtsdatum: "1992-07-12", nationalitaet: "D" },
  { nachname: "Eckhardt", vorname: "Tobias", geburtsdatum: "1989-07-14", nationalitaet: "D" },
  { nachname: "Elshani", vorname: "Labinot", geburtsdatum: "1989-03-16", nationalitaet: "YU" },
  { nachname: "Elshani", vorname: "Qendrim", geburtsdatum: "1992-03-31", nationalitaet: "D" },
  { nachname: "Först", vorname: "Christian", geburtsdatum: "1973-09-22", nationalitaet: "D" },
  { nachname: "Genc", vorname: "Ergenc", geburtsdatum: "2001-06-25", nationalitaet: "D" },
  { nachname: "Giuffrida", vorname: "Cortes Dennis", geburtsdatum: "1987-02-16", nationalitaet: "I" },
  { nachname: "Greulich", vorname: "Pascal", geburtsdatum: "1995-12-27", nationalitaet: "D" },
  { nachname: "Helfenstein", vorname: "Alexander", geburtsdatum: "1983-04-02", nationalitaet: "D" },
  { nachname: "Helfenstein", vorname: "Eduard", geburtsdatum: "1987-06-23", nationalitaet: "D" },
  { nachname: "Helfenstein", vorname: "Florian", geburtsdatum: "1990-03-17", nationalitaet: "D" },
  { nachname: "Herbach", vorname: "Raffael", geburtsdatum: "1995-12-20", nationalitaet: "D" },
  { nachname: "Honeck", vorname: "Yannic", geburtsdatum: "1995-10-13", nationalitaet: "D" },
  { nachname: "Hufnagel", vorname: "Andreas", geburtsdatum: "1966-09-05", nationalitaet: "D" },
  { nachname: "Hufnagel", vorname: "Dennis", geburtsdatum: "1990-06-22", nationalitaet: "D" },
  { nachname: "Jacob", vorname: "Silas", geburtsdatum: "2003-12-01", nationalitaet: "D" },
  { nachname: "Jamerson", vorname: "Brandon", geburtsdatum: "1994-11-18", nationalitaet: "D" },
  { nachname: "Jörg", vorname: "Andrej", geburtsdatum: "1987-08-17", nationalitaet: "D" },
  { nachname: "Justus", vorname: "Alexander", geburtsdatum: "2001-01-15", nationalitaet: "D" },
  { nachname: "Kaleli", vorname: "Oktay Can", geburtsdatum: "2000-09-18", nationalitaet: "D" },
  { nachname: "Kalenski", vorname: "Michael", geburtsdatum: "2005-10-31", nationalitaet: "D" },
  { nachname: "Kamanmaz", vorname: "Mert", geburtsdatum: "1997-07-23", nationalitaet: "D" },
  { nachname: "Kizildeniz", vorname: "Ibrahim", geburtsdatum: "1996-02-25", nationalitaet: "D" },
  { nachname: "Kotov", vorname: "Mikhail", geburtsdatum: "1997-02-25", nationalitaet: "RUS" },
  { nachname: "Kusnezow", vorname: "Kai Eugen", geburtsdatum: "2001-01-26", nationalitaet: "D" },
  { nachname: "Leneschmidt", vorname: "Kevin", geburtsdatum: "2001-07-25", nationalitaet: "D" },
  { nachname: "Lerke", vorname: "Vitalis", geburtsdatum: "2002-01-13", nationalitaet: "D" },
  { nachname: "Maslazov", vorname: "Michael", geburtsdatum: "2006-11-13", nationalitaet: "D" },
  { nachname: "Mayer", vorname: "Max", geburtsdatum: "2002-05-09", nationalitaet: "D" },
  { nachname: "Meier", vorname: "Kelvin", geburtsdatum: "2005-06-30", nationalitaet: "D" },
  { nachname: "Melcher", vorname: "Sergej", geburtsdatum: "1993-02-03", nationalitaet: "D" },
  { nachname: "Merlein", vorname: "Thomas", geburtsdatum: "2006-01-06", nationalitaet: "D" },
  { nachname: "Milks", vorname: "David", geburtsdatum: "1979-02-22", nationalitaet: "D" },
  { nachname: "Mittag", vorname: "Tobias", geburtsdatum: "2000-04-19", nationalitaet: "D" },
  { nachname: "Mustafa", vorname: "Sizar", geburtsdatum: "2000-02-27", nationalitaet: "I" },
  { nachname: "Neubig", vorname: "Christian", geburtsdatum: "1988-09-08", nationalitaet: "D" },
  { nachname: "Niedens", vorname: "Alexander", geburtsdatum: "1978-06-10", nationalitaet: "D" },
  { nachname: "Niedens", vorname: "Kevin", geburtsdatum: "2001-09-13", nationalitaet: "D" },
  { nachname: "Ostertag", vorname: "Daniel", geburtsdatum: "2000-11-12", nationalitaet: "D" },
  { nachname: "Papanikolaou", vorname: "Charalampos", geburtsdatum: "1976-01-30", nationalitaet: "GR" },
  { nachname: "Pavlov", vorname: "Johannes", geburtsdatum: "2002-07-02", nationalitaet: "D" },
  { nachname: "Pflugfelder", vorname: "Viktor", geburtsdatum: "1981-12-25", nationalitaet: "D" },
  { nachname: "Radivojevic", vorname: "Marko", geburtsdatum: "2003-11-21", nationalitaet: "SLO" },
  { nachname: "Rauch", vorname: "Manuel", geburtsdatum: "1997-02-02", nationalitaet: "D" },
  { nachname: "Rot", vorname: "Bruno", geburtsdatum: "1999-04-20", nationalitaet: "HR" },
  { nachname: "Sachnjuk", vorname: "Andreas", geburtsdatum: "1992-06-24", nationalitaet: "D" },
  { nachname: "Sachnjuk", vorname: "Stefan", geburtsdatum: "1996-12-24", nationalitaet: "D" },
  { nachname: "Scheurich", vorname: "Nico", geburtsdatum: "1995-02-21", nationalitaet: "D" },
  { nachname: "Schewtschenko", vorname: "Sergej", geburtsdatum: "1984-04-11", nationalitaet: "D" },
  { nachname: "Schmidt", vorname: "Arthur", geburtsdatum: "2002-04-23", nationalitaet: "D" },
  { nachname: "Schomber", vorname: "Dennis", geburtsdatum: "1984-04-05", nationalitaet: "D" },
  { nachname: "Schork", vorname: "Patrick", geburtsdatum: "1994-08-11", nationalitaet: "D" },
  { nachname: "Schulz", vorname: "Richard", geburtsdatum: "1994-12-30", nationalitaet: "D" },
  { nachname: "Souza Eisenlohr", vorname: "Tchiago", geburtsdatum: "1989-05-13", nationalitaet: "D" },
  { nachname: "Spät", vorname: "Alexander", geburtsdatum: "1988-03-26", nationalitaet: "D" },
  { nachname: "Spät", vorname: "Louis", geburtsdatum: "2006-09-02", nationalitaet: "D" },
  { nachname: "Spät", vorname: "Niklas", geburtsdatum: "2002-07-06", nationalitaet: "D" },
  { nachname: "Stang", vorname: "Manuel", geburtsdatum: "2001-09-30", nationalitaet: "D" },
  { nachname: "Stumpf", vorname: "Willi", geburtsdatum: "2004-09-20", nationalitaet: "D" },
  { nachname: "Stürmer", vorname: "Jannik", geburtsdatum: "1997-07-11", nationalitaet: "D" },
  { nachname: "Toska", vorname: "Avent", geburtsdatum: "1975-05-15", nationalitaet: "AL" },
  { nachname: "Toure", vorname: "Abdul Magas", geburtsdatum: "1998-09-22", nationalitaet: "GN" },
  { nachname: "Trippel", vorname: "Alexander", geburtsdatum: "1980-10-14", nationalitaet: "D" },
  { nachname: "Tulic", vorname: "Roberto", geburtsdatum: "1997-10-14", nationalitaet: "HR" },
  { nachname: "Walter", vorname: "Christian", geburtsdatum: "1985-06-25", nationalitaet: "D" },
  { nachname: "Walter", vorname: "Stefan", geburtsdatum: "1985-06-25", nationalitaet: "D" },
  { nachname: "Weiss", vorname: "Dominic", geburtsdatum: "2004-08-18", nationalitaet: "D" },
  { nachname: "Wolloner", vorname: "Fabian", geburtsdatum: "1995-09-15", nationalitaet: "D" },
  { nachname: "Zimbelmann", vorname: "Dennis", geburtsdatum: "1999-06-16", nationalitaet: "D" }
];

async function seedSpielerData() {
  console.log('🚀 Starte Spieler-Daten Import...');
  
  try {
    // Prüfe ob Nationalitäts-Feld im Mitglied-Schema existiert
    const mitgliedSchema = strapi.contentTypes['api::mitglied.mitglied'];
    if (!mitgliedSchema.attributes.nationalitaet) {
      console.log('⚠️  Nationalitäts-Feld fehlt im Mitglied-Schema');
      console.log('   Bitte füge folgendes Feld zum Mitglied-Schema hinzu:');
      console.log('   "nationalitaet": { "type": "string", "maxLength": 5 }');
      return;
    }

    let erstellteMitglieder = 0;
    let erstellteSpieler = 0;
    let fehler = 0;

    for (const spielerData of spielerDaten) {
      try {
        // 1. Mitglied erstellen
        const mitglied = await strapi.entityService.create('api::mitglied.mitglied', {
          data: {
            vorname: spielerData.vorname,
            nachname: spielerData.nachname,
            geburtsdatum: spielerData.geburtsdatum,
            nationalitaet: spielerData.nationalitaet,
            mitgliedsnummer: `VW-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            mitgliedsart: 'Aktiv',
            status: 'Aktiv',
            oeffentlich_sichtbar: true
          }
        });
        
        erstellteMitglieder++;
        console.log(`✅ Mitglied erstellt: ${spielerData.vorname} ${spielerData.nachname}`);

        // 2. Spieler erstellen (verknüpft mit Mitglied)
        const spieler = await strapi.entityService.create('api::spieler.spieler', {
          data: {
            vorname: spielerData.vorname,
            nachname: spielerData.nachname,
            mitglied: mitglied.id,
            status: 'aktiv'
          }
        });
        
        erstellteSpieler++;
        console.log(`⚽ Spieler erstellt: ${spielerData.vorname} ${spielerData.nachname}`);

      } catch (error) {
        fehler++;
        console.error(`❌ Fehler bei ${spielerData.vorname} ${spielerData.nachname}:`, error.message);
      }
    }

    console.log('\n📊 Import-Zusammenfassung:');
    console.log(`   Mitglieder erstellt: ${erstellteMitglieder}`);
    console.log(`   Spieler erstellt: ${erstellteSpieler}`);
    console.log(`   Fehler: ${fehler}`);
    console.log(`   Gesamt verarbeitet: ${spielerDaten.length}`);

  } catch (error) {
    console.error('💥 Kritischer Fehler beim Import:', error);
  }
}

// Export für manuellen Aufruf
module.exports = { seedSpielerData, spielerDaten };

// Automatischer Start wenn direkt ausgeführt
if (require.main === module) {
  // Für direkten Aufruf außerhalb von Strapi
  console.log('⚠️  Dieses Skript muss innerhalb von Strapi ausgeführt werden');
  console.log('   Verwende: npm run strapi console');
  console.log('   Dann: .load scripts/seed-spieler-data.js');
  console.log('   Und: seedSpielerData()');
}