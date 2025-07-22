const axios = require('axios');

// Import der extrahierten Torschützendaten
const torschuetzenData = require('../../screenshot-data-extraction/extracted-data/torschuetzen-backend-ready.json');

// Strapi API Configuration
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

/**
 * Script zum Aktualisieren bestehender Spieler mit Namen und Torschützendaten
 * Nutzt die neuen vorname/nachname Felder im Spieler-Schema
 */
async function updateSpielerWithNames() {
  console.log('🚀 Aktualisiere Spieler mit Namen und Torschützendaten...');
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

    console.log('📊 Lade bestehende Spieler...');
    
    // Hole die ersten 10 Spieler
    const spielerResponse = await axios.get(`${STRAPI_URL}/api/spielers`, {
      ...config,
      params: {
        pagination: {
          limit: 10
        }
      }
    });
    
    const spieler = spielerResponse.data.data;
    console.log(`✅ Gefunden: ${spieler.length} Spieler`);
    
    if (spieler.length === 0) {
      console.log('❌ Keine Spieler gefunden.');
      return;
    }
    
    console.log('🔄 Aktualisiere Spieler mit Namen und Torschützendaten...');
    
    let updatedCount = 0;
    let errors = 0;
    
    // Aktualisiere jeden Spieler mit den entsprechenden Torschützendaten
    for (let i = 0; i < Math.min(spieler.length, torschuetzenData.data.attributes.spieler.length); i++) {
      const currentSpieler = spieler[i];
      const torschuetze = torschuetzenData.data.attributes.spieler[i];
      
      const [vorname, ...nachnameTeile] = torschuetze.name.split(' ');
      const nachname = nachnameTeile.join(' ');
      
      try {
        const updateData = {
          data: {
            vorname: vorname,
            nachname: nachname,
            tore_saison: torschuetze.tore,
            spiele_saison: 18, // Standard-Anzahl Spiele
            position: 'sturm' // Standard-Position für Torschützen
          }
        };
        
        console.log(`🔄 Aktualisiere Spieler ${currentSpieler.documentId || currentSpieler.id}: ${vorname} ${nachname} - ${torschuetze.tore} Tore`);
        
        const spielerId = currentSpieler.documentId || currentSpieler.id;
        await axios.put(`${STRAPI_URL}/api/spielers/${spielerId}`, updateData, config);
        
        console.log(`✅ Spieler ${currentSpieler.id} erfolgreich aktualisiert`);
        updatedCount++;
        
        // Kleine Pause zwischen Updates
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`❌ Fehler beim Aktualisieren von Spieler ${currentSpieler.id}:`, error.response?.data?.error || error.message);
        errors++;
      }
    }
    
    console.log('\n📈 Update-Zusammenfassung:');
    console.log(`✅ Spieler erfolgreich aktualisiert: ${updatedCount}`);
    console.log(`❌ Fehler: ${errors}`);
    console.log(`📊 Torschützendaten verarbeitet: ${Math.min(spieler.length, torschuetzenData.data.attributes.spieler.length)} Einträge`);
    
    if (updatedCount > 0) {
      console.log('\n🎉 Update abgeschlossen!');
      console.log('🔍 Teste jetzt die API mit Namen:');
      console.log(`curl "${STRAPI_URL}/api/spielers?sort=tore_saison:desc&pagination[limit]=5"`);
      
      // Teste die API direkt
      console.log('\n📋 Top 5 Torschützen:');
      try {
        const testResponse = await axios.get(`${STRAPI_URL}/api/spielers`, {
          ...config,
          params: {
            sort: ['tore_saison:desc'],
            pagination: {
              limit: 5
            },
            filters: {
              tore_saison: {
                $gt: 0
              }
            }
          }
        });
        
        testResponse.data.data.forEach((spieler, index) => {
          const { vorname, nachname, tore_saison, spiele_saison } = spieler;
          console.log(`   ${index + 1}. ${vorname} ${nachname} - ${tore_saison} Tore (${spiele_saison} Spiele)`);
        });
        
      } catch (testError) {
        console.log('   ⚠️ Konnte API-Test nicht durchführen');
      }
    }
    
  } catch (error) {
    console.error('💥 Fehler beim Update:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Script ausführen
if (require.main === module) {
  updateSpielerWithNames();
}

module.exports = { updateSpielerWithNames };