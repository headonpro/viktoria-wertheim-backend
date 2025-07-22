const axios = require('axios');

/**
 * Script zum Testen der Torschützen-API
 * Testet verschiedene API-Endpunkte für Spielerdaten
 */
async function testTorschuetzenAPI() {
  console.log('🚀 Teste Torschützen-API...');
  
  const baseURL = process.env.STRAPI_URL || 'http://localhost:1337';
  
  try {
    console.log(`📡 Verbinde zu: ${baseURL}`);
    
    // Test 1: Alle Spieler mit Torschützendaten
    console.log('\n1️⃣ Teste: Alle Spieler mit Torschützendaten');
    try {
      const response = await axios.get(`${baseURL}/api/spielers`, {
        params: {
          populate: {
            mitglied: true,
            mannschaft: true
          },
          sort: ['tore_saison:desc'],
          filters: {
            tore_saison: {
              $gt: 0
            }
          }
        }
      });
      
      console.log(`✅ Gefunden: ${response.data.data.length} Spieler mit Toren`);
      
      // Zeige Top 5 Torschützen
      const topScorers = response.data.data.slice(0, 5);
      console.log('\n🏆 Top 5 Torschützen:');
      topScorers.forEach((spieler, index) => {
        const vorname = spieler.vorname || 'Unbekannt';
        const nachname = spieler.nachname || '';
        const name = `${vorname} ${nachname}`.trim();
        const tore = spieler.tore_saison;
        const spiele = spieler.spiele_saison;
        console.log(`   ${index + 1}. ${name} - ${tore} Tore (${spiele} Spiele)`);
      });
      
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Spielerdaten:', error.message);
    }
    
    // Test 2: Spieler einer bestimmten Mannschaft
    console.log('\n2️⃣ Teste: Spieler der 1. Mannschaft');
    try {
      const response = await axios.get(`${baseURL}/api/spielers`, {
        params: {
          populate: {
            mitglied: true,
            mannschaft: true
          },
          filters: {
            mannschaft: {
              name: {
                $containsi: '1. Mannschaft'
              }
            }
          },
          sort: ['tore_saison:desc']
        }
      });
      
      console.log(`✅ Gefunden: ${response.data.data.length} Spieler in der 1. Mannschaft`);
      
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Mannschaftsdaten:', error.message);
    }
    
    // Test 3: Einzelner Spieler mit allen Details
    console.log('\n3️⃣ Teste: Einzelner Spieler mit Details');
    try {
      const response = await axios.get(`${baseURL}/api/spielers`, {
        params: {
          populate: {
            mitglied: true,
            mannschaft: true,
            spielerfoto: true
          },
          filters: {
            tore_saison: {
              $gt: 0
            }
          },
          sort: ['tore_saison:desc'],
          pagination: {
            limit: 1
          }
        }
      });
      
      if (response.data.data.length > 0) {
        const spieler = response.data.data[0];
        const mitglied = spieler.attributes.mitglied?.data?.attributes;
        
        console.log('✅ Spieler-Details:');
        console.log(`   Name: ${mitglied?.vorname} ${mitglied?.nachname}`);
        console.log(`   Tore: ${spieler.attributes.tore_saison}`);
        console.log(`   Spiele: ${spieler.attributes.spiele_saison}`);
        console.log(`   Position: ${spieler.attributes.position}`);
        console.log(`   Status: ${spieler.attributes.status}`);
        console.log(`   Mannschaft: ${spieler.attributes.mannschaft?.data?.attributes?.name || 'Keine'}`);
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Spieler-Details:', error.message);
    }
    
    // Test 4: API-Struktur für Frontend
    console.log('\n4️⃣ Teste: API-Struktur für Frontend');
    try {
      const response = await axios.get(`${baseURL}/api/spielers`, {
        params: {
          populate: {
            mitglied: {
              fields: ['vorname', 'nachname']
            },
            mannschaft: {
              fields: ['name']
            }
          },
          fields: ['tore_saison', 'spiele_saison', 'position', 'status'],
          sort: ['tore_saison:desc'],
          pagination: {
            limit: 10
          }
        }
      });
      
      console.log('✅ Frontend-kompatible Datenstruktur:');
      console.log(`   Anzahl Spieler: ${response.data.data.length}`);
      console.log(`   Pagination: ${JSON.stringify(response.data.meta.pagination)}`);
      
      // Beispiel-Datenstruktur
      if (response.data.data.length > 0) {
        const beispiel = response.data.data[0];
        console.log('\n📋 Beispiel-Datenstruktur:');
        console.log(JSON.stringify(beispiel, null, 2));
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Testen der Frontend-Struktur:', error.message);
    }
    
    console.log('\n🎉 API-Tests abgeschlossen!');
    
  } catch (error) {
    console.error('💥 Allgemeiner Fehler:', error.message);
    process.exit(1);
  }
}

// Script ausführen
if (require.main === module) {
  testTorschuetzenAPI();
}

module.exports = { testTorschuetzenAPI };