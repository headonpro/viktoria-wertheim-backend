/**
 * Skript zum Reparieren der PostgreSQL-Sequenzen
 */

console.log('🔧 Repariere PostgreSQL-Sequenzen...');

const { Client } = require('pg');

// PostgreSQL-Verbindungsdetails aus Strapi-Konfiguration
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'viktoria_wertheim',
  user: 'postgres',
  password: 'postgres123'
});

/**
 * Repariert die Sequenz für eine Tabelle
 */
async function fixSequence(tableName, sequenceName) {
  try {
    // Hole die höchste ID aus der Tabelle
    const maxIdResult = await client.query(`SELECT MAX(id) as max_id FROM ${tableName}`);
    const maxId = maxIdResult.rows[0].max_id || 0;
    
    // Setze die Sequenz auf die nächste verfügbare ID
    const nextId = maxId + 1;
    await client.query(`ALTER SEQUENCE ${sequenceName} RESTART WITH ${nextId}`);
    
    console.log(`✅ Sequenz ${sequenceName} auf ${nextId} gesetzt (max ID in ${tableName}: ${maxId})`);
    return true;
  } catch (error) {
    console.error(`❌ Fehler bei ${tableName}:`, error.message);
    return false;
  }
}

/**
 * Hauptfunktion
 */
async function main() {
  try {
    console.log('🔗 Verbinde mit PostgreSQL...');
    await client.connect();
    console.log('✅ PostgreSQL-Verbindung erfolgreich');

    // Repariere die wichtigsten Sequenzen
    const sequences = [
      { table: 'up_permissions', sequence: 'up_permissions_id_seq' },
      { table: 'up_roles', sequence: 'up_roles_id_seq' },
      { table: 'up_users', sequence: 'up_users_id_seq' },
      { table: 'strapi_core_store_settings', sequence: 'strapi_core_store_settings_id_seq' }
    ];

    console.log('🔧 Repariere Sequenzen...');
    let successCount = 0;

    for (const { table, sequence } of sequences) {
      const success = await fixSequence(table, sequence);
      if (success) successCount++;
    }

    console.log(`\n📊 Zusammenfassung:`);
    console.log(`✅ Erfolgreich repariert: ${successCount}`);
    console.log(`❌ Fehler: ${sequences.length - successCount}`);

    if (successCount > 0) {
      console.log('\n🎉 Sequenzen repariert! Du kannst jetzt die Berechtigungen in Strapi setzen.');
      console.log('💡 Gehe zu Strapi Admin → Settings → Users & Permissions → Roles → Public');
      console.log('💡 Aktiviere die benötigten Berechtigungen für Spieler und Mannschaften');
    }

  } catch (error) {
    console.error('❌ Verbindungsfehler:', error.message);
    console.log('\n💡 Stelle sicher, dass:');
    console.log('   - PostgreSQL läuft');
    console.log('   - Die Verbindungsdetails korrekt sind');
    console.log('   - Du die richtige Datenbank und Credentials verwendest');
  } finally {
    await client.end();
  }
}

// Skript ausführen
main().catch(error => {
  console.error('❌ Unerwarteter Fehler:', error);
});