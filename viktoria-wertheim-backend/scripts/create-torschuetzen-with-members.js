const axios = require('axios');

// Import der extrahierten Torschützendaten
const torschuetzenData = require('../../screenshot-data-extraction/extracted-data/torschuetzen-backend-ready.json');

// Strapi API Configuration
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

/**
 * Script zum Erstellen von Mitgliedern und Spielern mit Torschützendaten
 * Löst das Problem der fehlenden Namen durch Erstellung kompletter Datensätze
 */
async function createTorschuetzenWithMembers() {
  console.log('🚀 Erstelle Torschützen mit Mitgliedern...');
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
    let errors = 0;
    
    for (const torschuetze of torschuetzenData.data.attributes.spieler) {
      const { name, tore } = torschuetze;
      const [vorname, ...nachnameTeile] = name.split(' ');
      const nachname = nachnameTeile.join(' ');
      
      console.log(`🔍 Erstelle: ${vorname} ${nachname} (${tore} Tore)`);
      
      try {
        // 1. Erstelle Mitglied
        const mitgliedData = {
          data: {
            vorname: vorname,
            nachname: nachname,
            email: `${vorname.toLowerCase()}.${nachname.toLowerCase()}@viktoria-wertheim.de`,
            mitgliedsnummer: `VW${Date.now()}${Math.floor(Math.random() * 1000)}`,
            beitrittsdatum: '2024-01-01',
            mitgliedsstatus: 'aktiv',
            mitgliedstyp: 'spieler',
            benutzerrolle: 'spieler',
            datenschutz_akzeptiert: true,
            newsletter_aktiv: true,
            publishedAt: new Date().toISOString()
          }
        };
        
        console.log(`   📝 Erstelle Mitglied: ${vorname} ${nachname}`);
        const mitgliedResponse = await axios.post(`${STRAPI_URL}/api/mitglieder`, mitgliedData, config);
        const mitgliedId = mitgliedResponse.data.data.id;
        console.log(`   ✅ Mitglied erstellt (ID: ${mitgliedId})`);
        createdMitglieder++;
        
        // Kleine Pause
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 2. Erstelle Spieler mit Mitglied-Verknüpfung
        const spielerData = {
          data: {
            mitglied: mitgliedId,
            position: 'sturm', // Standard für Torschützen
            tore_saison: tore,
            spiele_saison: 18,
            status: 'aktiv',
            publishedAt: new Date().toISOString()
          }
        };
        
        console.log(`   ⚽ Erstelle Spieler für: ${vorname} ${nachname}`);
        const spielerResponse = await axios.post(`${STRAPI_URL}/api/spielers`, spielerData, config);
        const spielerId = spielerResponse.data.data.id;
        console.log(`   ✅ Spieler erstellt (ID: ${spielerId}) - ${tore} Tore`);
        createdSpieler++;
        
        // Pause zwischen Spielern
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`   ❌ Fehler bei ${vorname} ${nachname}:`, error.response?.data?.error || error.message);
        errors++;
      }
    }
    
    console.log('\n📈 Erstellungs-Zusammenfassung:');
    console.log(`👥 Neue Mitglieder erstellt: ${createdMitglieder}`);
    console.log(`⚽ Neue Spieler erstellt: ${createdSpieler}`);
    console.log(`❌ Fehler: ${errors}`);
    console.log(`📊 Gesamt verarbeitet: ${torschuetzenData.data.attributes.spieler.length} Einträge`);
    
    if (createdSpieler > 0) {
      console.log('\n🎉 Torschützen erfolgreich erstellt!');
      console.log('🔍 Teste jetzt die API mit Namen:');
      console.log(`curl "${STRAPI_URL}/api/spielers?populate=mitglied&sort=tore_saison:desc"`);
    }
    
  } catch (error) {
    console.error('💥 Fehler beim Erstellen:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Script ausführen
if (require.main === module) {
  createTorschuetzenWithMembers();
}

module.exports = { createTorschuetzenWithMembers };