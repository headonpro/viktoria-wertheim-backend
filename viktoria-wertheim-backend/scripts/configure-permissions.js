/**
 * Skript zum Konfigurieren der Strapi API-Berechtigungen
 */

console.log('🔧 Konfiguriere Strapi API-Berechtigungen...');

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';

/**
 * Holt die Public Role ID
 */
async function getPublicRoleId() {
  try {
    const response = await axios.get(`${STRAPI_URL}/api/users-permissions/roles`);
    const roles = response.data.roles;
    const publicRole = roles.find(role => role.type === 'public');
    
    if (publicRole) {
      console.log('✅ Public Role gefunden, ID:', publicRole.id);
      return publicRole.id;
    } else {
      console.error('❌ Public Role nicht gefunden');
      return null;
    }
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Rollen:', error.message);
    return null;
  }
}

/**
 * Konfiguriert Berechtigungen für Public Role
 */
async function configurePermissions(roleId) {
  try {
    // Berechtigungen für verschiedene Content-Types
    const permissions = {
      'api::spieler.spieler': ['find', 'findOne', 'create'],
      'api::mannschaft.mannschaft': ['find', 'findOne', 'create'],
      'api::spiel.spiel': ['find', 'findOne'],
      'api::news-artikel.news-artikel': ['find', 'findOne']
    };

    console.log('🔧 Konfiguriere Berechtigungen...');

    for (const [contentType, actions] of Object.entries(permissions)) {
      for (const action of actions) {
        try {
          const permissionData = {
            role: roleId,
            action: `${contentType}.${action}`,
            subject: null,
            properties: {},
            conditions: []
          };

          const response = await axios.post(`${STRAPI_URL}/api/users-permissions/permissions`, permissionData);
          console.log(`✅ Berechtigung erstellt: ${contentType}.${action}`);
        } catch (error) {
          if (error.response?.status === 409) {
            console.log(`⏭️  Berechtigung bereits vorhanden: ${contentType}.${action}`);
          } else {
            console.error(`❌ Fehler bei ${contentType}.${action}:`, error.response?.data || error.message);
          }
        }
      }
    }

    console.log('✅ Berechtigungen konfiguriert');
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Konfigurieren der Berechtigungen:', error.message);
    return false;
  }
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log('🚀 Starte Berechtigungs-Konfiguration...');

  const roleId = await getPublicRoleId();
  if (!roleId) {
    console.error('❌ Kann nicht fortfahren ohne Public Role ID');
    return;
  }

  const success = await configurePermissions(roleId);
  if (success) {
    console.log('🎉 Berechtigungen erfolgreich konfiguriert!');
    console.log('💡 Du kannst jetzt das Import-Skript erneut ausführen');
  } else {
    console.error('❌ Berechtigungs-Konfiguration fehlgeschlagen');
  }
}

// Skript ausführen
main().catch(error => {
  console.error('❌ Unerwarteter Fehler:', error);
});