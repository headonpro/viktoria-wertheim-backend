const axios = require('axios');

// Import der extrahierten Torschützendaten
const torschuetzenData = require('../../screenshot-data-extraction/extracted-data/torschuetzen-backend-ready.json');

// Strapi API Configuration
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

/**
 * Vereinfachtes Script zum Aktualisieren bestehender Spieler mit Torschützendaten
 * Aktualisiert die ersten 10 Spieler mit den extrahierten Torschützendaten
 */
async function updateTorschuetzenSimple() {
  console.log('🚀 Starte vereinfachtes Torschützen-Update...');
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
      console.log('❌ Keine Spieler gefunden. Bitte erst Spieler erstellen.');
      return;
    }
    
    console.log('🔄 Aktualisiere Spieler mit Torschützendaten...');
    
    let updatedCount = 0;
    
    // Aktualisiere jeden Spieler mit den entsprechenden Torschützendaten
    for (let i = 0; i < Math.min(spieler.length, torschuetzenData.data.attributes.spieler.length); i++) {
      const currentSpieler = spieler[i];
      const torschuetze = torschuetzenData.data.attributes.spieler[i];
      
      try {
        const updateData = {
          data: {
            tore_saison: torschuetze.tore,
            spiele_saison: 18, // Standard-Anzahl Spiele
            position: 'sturm' // Standard-Position für Torschützen
          }
        };
        
        await axios.put(`${STRAPI_URL}/api/spielers/${currentSpieler.id}`, updateData, config);
        
        console.log(`✅ Spieler ${currentSpieler.id} aktualisiert: ${torschuetze.name} - ${torschuetze.tore} Tore`);
        updatedCount++;
        
        // Kleine Pause zwischen Updates
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Fehler beim Aktualisieren von Spieler ${currentSpieler.id}:`, error.response?.data || error.message);
      }
    }
    
    console.log('\n📈 Update-Zusammenfassung:');
    console.log(`🔄 Spieler aktualisiert: ${updatedCount}`);
    console.log(`📊 Torschützendaten verarbeitet: ${torschuetzenData.data.attributes.spieler.length} Einträge`);
    
    console.log('🎉 Update abgeschlossen!');
    
  } catch (error) {
    console.error('💥 Fehler beim Update:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Script ausführen
if (require.main === module) {
  updateTorschuetzenSimple();
}

module.exports = { updateTorschuetzenSimple };