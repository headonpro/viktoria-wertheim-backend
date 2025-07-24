/**
 * Debug-Skript um die korrekten API-Endpoints zu finden
 */

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';
const apiClient = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

async function debugEndpoints() {
  console.log('🔍 Debug: API-Endpoints analysieren...\n');
  
  try {
    // 1. Teste verschiedene Spieler-Endpoints
    console.log('⚽ Teste Spieler-Endpoints:');
    
    const spielerEndpoints = ['/spielers', '/spieler'];
    
    for (const endpoint of spielerEndpoints) {
      try {
        const response = await apiClient.get(`${endpoint}?pagination[limit]=1`);
        console.log(`   ✅ ${endpoint} funktioniert (${response.data.data.length} Einträge)`);
        
        if (response.data.data.length > 0) {
          const firstEntry = response.data.data[0];
          console.log(`      Beispiel-ID: ${firstEntry.id}`);
          console.log(`      Beispiel-Name: ${firstEntry.attributes?.vorname || firstEntry.vorname} ${firstEntry.attributes?.nachname || firstEntry.nachname}`);
          
          // Teste PUT-Request auf ersten Eintrag
          try {
            const putResponse = await apiClient.put(`${endpoint}/${firstEntry.id}`, {
              data: {
                status: 'aktiv' // Keine Änderung, nur Test
              }
            });
            console.log(`      ✅ PUT ${endpoint}/${firstEntry.id} funktioniert`);
          } catch (putError) {
            console.log(`      ❌ PUT ${endpoint}/${firstEntry.id} Fehler: ${putError.response?.status} ${putError.response?.statusText}`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ ${endpoint} Fehler: ${error.response?.status} ${error.response?.statusText}`);
      }
    }
    
    // 2. Teste Mitglieder-Endpoint
    console.log('\n👥 Teste Mitglieder-Endpoint:');
    try {
      const response = await apiClient.get('/mitglieder?pagination[limit]=1');
      console.log(`   ✅ /mitglieder funktioniert (${response.data.data.length} Einträge)`);
      
      if (response.data.data.length > 0) {
        const firstEntry = response.data.data[0];
        console.log(`      Beispiel-ID: ${firstEntry.id}`);
        console.log(`      Beispiel-Name: ${firstEntry.attributes?.vorname || firstEntry.vorname} ${firstEntry.attributes?.nachname || firstEntry.nachname}`);
      }
    } catch (error) {
      console.log(`   ❌ /mitglieder Fehler: ${error.response?.status} ${error.response?.statusText}`);
    }
    
    // 3. Teste Relation-Update
    console.log('\n🔗 Teste Relation-Update:');
    try {
      const spielerResponse = await apiClient.get('/spielers?pagination[limit]=1');
      const mitgliederResponse = await apiClient.get('/mitglieder?pagination[limit]=1');
      
      if (spielerResponse.data.data.length > 0 && mitgliederResponse.data.data.length > 0) {
        const spieler = spielerResponse.data.data[0];
        const mitglied = mitgliederResponse.data.data[0];
        
        console.log(`   Teste Relation: Spieler ${spieler.id} → Mitglied ${mitglied.id}`);
        
        // Verschiedene Relation-Syntaxen testen
        const relationSyntaxes = [
          { mitglied: mitglied.id },
          { mitglied: { connect: [mitglied.id] } },
          { mitglied: { set: [mitglied.id] } }
        ];
        
        for (const [index, syntax] of relationSyntaxes.entries()) {
          try {
            const testResponse = await apiClient.put(`/spielers/${spieler.id}`, {
              data: syntax
            });
            console.log(`   ✅ Syntax ${index + 1} funktioniert:`, JSON.stringify(syntax));
            break; // Erste funktionierende Syntax verwenden
          } catch (error) {
            console.log(`   ❌ Syntax ${index + 1} Fehler:`, JSON.stringify(syntax), error.response?.status);
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Relation-Test Fehler: ${error.message}`);
    }
    
  } catch (error) {
    console.error('💥 Debug-Fehler:', error.message);
  }
}

debugEndpoints();