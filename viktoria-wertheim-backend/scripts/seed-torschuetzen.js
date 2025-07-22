const axios = require('axios');

// Import der extrahierten Torschützendaten
const torschuetzenData = require('../../screenshot-data-extraction/extracted-data/torschuetzen-backend-ready.json');

// Strapi API Configuration
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

/**
 * Script zum Erstellen von Spielern und Mitgliedern basierend auf Torschützendaten
 * Erstellt fehlende Mitglieder und Spieler-Einträge
 */
async function seedTorschuetzenData() {
  console.log('🚀 Starte Seeding der Torschützendaten...');
  console.log(`📡 Strapi URL: ${STRAPI_URL}`);
  
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (API_TOKEN) {
      config.headers['Authorization'] = `Bearer ${API_TOKEN}`;
    }
    
    console.log('📊 Verarbeite Torschützendaten...');
    
    let createdMitglieder = 0;
    let createdSpieler = 0;
    let updatedSpieler = 0;
    
    // Hole erste Mannschaft (1. Mannschaft)
    try {
      const mannschaftenResponse = await axios.get(`${STRAPI_URL}/api/mannschaften`, {
        ...config,
        params: {
          filters: {
            name: {
              $containsi: '1. Mannschaft'
            }
          }
        }
      });
      
      let mannschaftId = null;
      if (mannschaftenResponse.data.data.length > 0) {
        mannschaftId = mannschaftenResponse.data.data[0].id;
        console.log(`📋 Verwende Mannschaft: ${mannschaftenResponse.data.data[0].attributes.name} (ID: ${mannschaftId})`);
      } else {
        console.log('⚠️ Keine 1. Mannschaft gefunden, erstelle Spieler ohne Mannschaftszuordnung');
      }
      
      for (const torschuetze of torschuetzenData.data.attributes.spieler) {
        const { name, tore } = torschuetze;
        const [vorname, ...nachnameTeile] = name.split(' ');
        const nachname = nachnameTeile.join(' ');
        
        console.log(`🔍 Verarbeite: ${vorname} ${nachname} (${tore} Tore)`);
        
        try {
          // Prüfe ob Mitglied bereits existiert
          const mitgliederResponse = await axios.get(`${STRAPI_URL}/api/mitglieds`, {
            ...config,
            params: {
              filters: {
                vorname: { $containsi: vorname },
                nachname: { $containsi: nachname }
              }
            }
          });
          
          let mitgliedId;
          
          if (mitgliederResponse.data.data.length === 0) {
            // Erstelle neues Mitglied
            const mitgliedData = {
              data: {
                vorname: vorname,
                nachname: nachname,
                email: `${vorname.toLowerCase()}.${nachname.toLowerCase()}@viktoria-wertheim.de`,
                mitgliedsnummer: `VW${Date.now()}${Math.floor(Math.random() * 100)}`,
                beitrittsdatum: new Date().toISOString().split('T')[0],
                status: 'aktiv',
                mitgliedsart: 'spieler',
                publishedAt: new Date().toISOString()
              }
            };
            
            const neuesMitgliedResponse = await axios.post(`${STRAPI_URL}/api/mitglieds`, mitgliedData, config);
            mitgliedId = neuesMitgliedResponse.data.data.id;
            console.log(`✅ Mitglied erstellt: ${vorname} ${nachname} (ID: ${mitgliedId})`);
            createdMitglieder++;
          } else {
            mitgliedId = mitgliederResponse.data.data[0].id;
            console.log(`📋 Mitglied existiert bereits: ${vorname} ${nachname} (ID: ${mitgliedId})`);
          }
          
          // Prüfe ob Spieler-Eintrag bereits existiert
          const spielerResponse = await axios.get(`${STRAPI_URL}/api/spielers`, {
            ...config,
            params: {
              filters: {
                mitglied: mitgliedId
              }
            }
          });
          
          if (spielerResponse.data.data.length === 0) {
            // Erstelle neuen Spieler-Eintrag
            const spielerData = {
              data: {
                mitglied: mitgliedId,
                position: 'sturm', // Standard-Position für Torschützen
                tore_saison: tore,
                spiele_saison: 18, // Standard-Anzahl Spiele
                status: 'aktiv',
                publishedAt: new Date().toISOString()
              }
            };
            
            if (mannschaftId) {
              spielerData.data.mannschaft = mannschaftId;
            }
            
            const neuerSpielerResponse = await axios.post(`${STRAPI_URL}/api/spielers`, spielerData, config);
            console.log(`✅ Spieler erstellt: ${vorname} ${nachname} - ${tore} Tore (ID: ${neuerSpielerResponse.data.data.id})`);
            createdSpieler++;
          } else {
            // Aktualisiere bestehenden Spieler
            const spielerId = spielerResponse.data.data[0].id;
            const updateData = {
              data: {
                tore_saison: tore,
                spiele_saison: spielerResponse.data.data[0].attributes.spiele_saison || 18
              }
            };
            
            await axios.put(`${STRAPI_URL}/api/spielers/${spielerId}`, updateData, config);
            console.log(`🔄 Spieler aktualisiert: ${vorname} ${nachname} - ${tore} Tore`);
            updatedSpieler++;
          }
          
          // Kleine Pause zwischen Requests
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`❌ Fehler bei ${vorname} ${nachname}:`, error.response?.data || error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Mannschaften:', error.response?.data || error.message);
    }
    
    console.log('\n📈 Seeding-Zusammenfassung:');
    console.log(`👥 Neue Mitglieder erstellt: ${createdMitglieder}`);
    console.log(`⚽ Neue Spieler erstellt: ${createdSpieler}`);
    console.log(`🔄 Spieler aktualisiert: ${updatedSpieler}`);
    console.log(`📊 Gesamt verarbeitet: ${torschuetzenData.data.attributes.spieler.length} Einträge`);
    
    console.log('🎉 Seeding abgeschlossen!');
    
  } catch (error) {
    console.error('💥 Fehler beim Seeding:', error);
    process.exit(1);
  }
}

// Script ausführen
if (require.main === module) {
  seedTorschuetzenData();
}

module.exports = { seedTorschuetzenData };