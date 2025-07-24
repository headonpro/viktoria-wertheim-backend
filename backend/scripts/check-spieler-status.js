/**
 * Überprüfung des aktuellen Status der Spieler-Daten
 */

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';
const apiClient = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

async function checkStatus() {
  console.log('🔍 Überprüfe Spieler-Daten Status...\n');
  
  try {
    // Mitglieder zählen (alle abrufen)
    const mitgliederResponse = await apiClient.get('/mitglieder?pagination[limit]=100');
    const mitglieder = mitgliederResponse.data.data;
    const mitgliederTotal = mitgliederResponse.data.meta.pagination.total;
    console.log(`👥 Mitglieder: ${mitgliederTotal} (abgerufen: ${mitglieder.length})`);
    
    // Spieler zählen (alle abrufen)
    const spielerResponse = await apiClient.get('/spielers?pagination[limit]=100');
    const spieler = spielerResponse.data.data;
    const spielerTotal = spielerResponse.data.meta.pagination.total;
    console.log(`⚽ Spieler: ${spielerTotal} (abgerufen: ${spieler.length})`);
    
    // Erste 5 Mitglieder mit Details
    console.log('\n📋 Erste 5 Mitglieder:');
    if (mitglieder.length > 0) {
      mitglieder.slice(0, 5).forEach((mitglied, index) => {
        const attrs = mitglied.attributes || mitglied;
        console.log(`${index + 1}. ${attrs.vorname} ${attrs.nachname} (ID: ${mitglied.id})`);
        console.log(`   Nationalität: ${attrs.nationalitaet || 'nicht gesetzt'}`);
        console.log(`   Mitgliedsnummer: ${attrs.mitgliedsnummer}`);
      });
    }
    
    // Erste 5 Spieler mit Details
    console.log('\n⚽ Erste 5 Spieler:');
    const spielerMitDetails = await apiClient.get('/spielers?populate=mitglied&pagination[limit]=100');
    const spielerDetails = spielerMitDetails.data.data;
    
    if (spielerDetails.length > 0) {
      spielerDetails.slice(0, 5).forEach((spieler, index) => {
        const attrs = spieler.attributes || spieler;
        const mitgliedRelation = attrs.mitglied?.data;
        console.log(`${index + 1}. ${attrs.vorname} ${attrs.nachname} (ID: ${spieler.id})`);
        console.log(`   Status: ${attrs.status}`);
        console.log(`   Mitglied verknüpft: ${mitgliedRelation ? `Ja (ID: ${mitgliedRelation.id})` : 'Nein'}`);
      });
      
      // Statistik über Relationen (alle Spieler berücksichtigen)
      const spielerOhneRelation = spielerDetails.filter(s => {
        const attrs = s.attributes || s;
        return !attrs.mitglied?.data;
      }).length;
      const spielerMitRelation = spielerDetails.filter(s => {
        const attrs = s.attributes || s;
        return attrs.mitglied?.data;
      }).length;
      
      console.log('\n📊 Relation-Status:');
      console.log(`   ✅ Spieler mit Mitglied-Verknüpfung: ${spielerMitRelation}`);
      console.log(`   ❌ Spieler ohne Mitglied-Verknüpfung: ${spielerOhneRelation}`);
      
      if (spielerOhneRelation > 0) {
        console.log('\n💡 Tipp: Du kannst die fehlenden Relationen über das Strapi Admin Panel setzen:');
        console.log('   http://localhost:1337/admin/content-manager/collection-types/api::spieler.spieler');
      }
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Status-Check:', error.message);
  }
}

checkStatus();