/**
 * Direkter Test mit detailliertem Logging
 */

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';

async function testDirectUpdate() {
  console.log('🔍 Teste direktes Update mit detailliertem Logging...\n');
  
  try {
    // 1. Hole ersten Spieler
    console.log('1. Hole ersten Spieler...');
    const response = await axios.get(`${STRAPI_URL}/api/spielers/1`);
    console.log('   Status:', response.status);
    console.log('   Spieler:', response.data.data.attributes.vorname, response.data.data.attributes.nachname);
    
    // 2. Teste verschiedene Update-Methoden
    console.log('\n2. Teste PUT-Request...');
    
    const updateData = {
      data: {
        status: 'aktiv' // Keine Änderung, nur Test
      }
    };
    
    try {
      const putResponse = await axios.put(`${STRAPI_URL}/api/spielers/1`, updateData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('   ✅ PUT erfolgreich:', putResponse.status);
    } catch (putError) {
      console.log('   ❌ PUT Fehler:', putError.response?.status, putError.response?.statusText);
      console.log('   Response:', putError.response?.data);
      
      // Teste PATCH als Alternative
      console.log('\n3. Teste PATCH-Request...');
      try {
        const patchResponse = await axios.patch(`${STRAPI_URL}/api/spielers/1`, updateData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('   ✅ PATCH erfolgreich:', patchResponse.status);
      } catch (patchError) {
        console.log('   ❌ PATCH Fehler:', patchError.response?.status, patchError.response?.statusText);
        console.log('   Response:', patchError.response?.data);
      }
    }
    
    // 4. Teste mit Admin API
    console.log('\n4. Teste Admin API...');
    try {
      const adminResponse = await axios.put(`${STRAPI_URL}/admin/content-manager/collection-types/api::spieler.spieler/1`, updateData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('   ✅ Admin API erfolgreich:', adminResponse.status);
    } catch (adminError) {
      console.log('   ❌ Admin API Fehler:', adminError.response?.status, adminError.response?.statusText);
    }
    
  } catch (error) {
    console.error('💥 Fehler:', error.message);
  }
}

testDirectUpdate();