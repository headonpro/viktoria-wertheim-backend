#!/usr/bin/env node

/**
 * Fix missing Strapi metadata that causes admin panel errors
 * This script adds missing document_id, locale, and user references
 * Using simple UUID generation without external dependencies
 */

const { Client } = require('pg');
const crypto = require('crypto');

// Simple UUID v4 generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function main() {
  console.log('🔧 Fixing Strapi metadata for admin panel...\n');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'viktoria_wertheim',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Step 1: Get admin user ID
    const adminUserId = await getAdminUserId(client);

    // Step 2: Fix missing metadata
    await fixMissingMetadata(client, adminUserId);

    // Step 3: Verify fixes
    await verifyFixes(client);

    console.log('\n✅ Metadata fix completed!');
    console.log('🔄 Please restart Strapi backend now!');

  } catch (error) {
    console.error('❌ Error during fix:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

async function getAdminUserId(client) {
  console.log('\n🔍 Finding admin user...');

  const adminUser = await client.query(`
    SELECT id, firstname, lastname, email
    FROM admin_users
    ORDER BY id
    LIMIT 1
  `);

  if (adminUser.rows.length === 0) {
    console.log('❌ No admin user found, using default ID 1');
    return 1;
  }

  const user = adminUser.rows[0];
  console.log(`✅ Found admin user: ${user.firstname} ${user.lastname} (${user.email}) - ID: ${user.id}`);
  return user.id;
}

async function fixMissingMetadata(client, adminUserId) {
  console.log('\n🔧 Fixing missing metadata...\n');

  // Get all entries that need fixing
  const entries = await client.query(`
    SELECT id, team_name
    FROM tabellen_eintraege
    WHERE document_id IS NULL 
       OR locale IS NULL 
       OR created_by_id IS NULL 
       OR updated_by_id IS NULL
    ORDER BY id
  `);

  console.log(`Found ${entries.rows.length} entries to fix:`);

  let fixedCount = 0;

  for (const entry of entries.rows) {
    try {
      // Generate a unique document_id
      const documentId = generateUUID();
      
      const updateResult = await client.query(`
        UPDATE tabellen_eintraege 
        SET 
          document_id = $1,
          locale = 'en',
          created_by_id = $2,
          updated_by_id = $2
        WHERE id = $3
      `, [documentId, adminUserId, entry.id]);

      if (updateResult.rowCount > 0) {
        console.log(`  ✅ Fixed ID ${entry.id}: "${entry.team_name}"`);
        fixedCount++;
      } else {
        console.log(`  ❌ Failed to fix ID ${entry.id}: "${entry.team_name}"`);
      }

    } catch (error) {
      console.error(`  ❌ Error fixing ID ${entry.id}: ${error.message}`);
    }
  }

  console.log(`\n📊 Fixed ${fixedCount}/${entries.rows.length} entries`);
}

async function verifyFixes(client) {
  console.log('\n🔍 Verifying fixes...\n');

  // Check for remaining null values
  const remainingIssues = await client.query(`
    SELECT 
      COUNT(*) FILTER (WHERE document_id IS NULL) as missing_document_id,
      COUNT(*) FILTER (WHERE locale IS NULL) as missing_locale,
      COUNT(*) FILTER (WHERE created_by_id IS NULL) as missing_created_by,
      COUNT(*) FILTER (WHERE updated_by_id IS NULL) as missing_updated_by
    FROM tabellen_eintraege
  `);

  const issues = remainingIssues.rows[0];
  
  if (issues.missing_document_id > 0 || issues.missing_locale > 0 || 
      issues.missing_created_by > 0 || issues.missing_updated_by > 0) {
    console.log('❌ Still found issues:');
    if (issues.missing_document_id > 0) console.log(`  - Missing document_id: ${issues.missing_document_id}`);
    if (issues.missing_locale > 0) console.log(`  - Missing locale: ${issues.missing_locale}`);
    if (issues.missing_created_by > 0) console.log(`  - Missing created_by_id: ${issues.missing_created_by}`);
    if (issues.missing_updated_by > 0) console.log(`  - Missing updated_by_id: ${issues.missing_updated_by}`);
  } else {
    console.log('✅ All metadata issues fixed!');
  }

  // Show sample of fixed entries
  const sampleEntries = await client.query(`
    SELECT id, team_name, document_id, locale, created_by_id, updated_by_id
    FROM tabellen_eintraege
    ORDER BY id
    LIMIT 5
  `);

  console.log('\n📋 Sample of fixed entries:');
  sampleEntries.rows.forEach(row => {
    console.log(`  - ID ${row.id}: "${row.team_name}"`);
    console.log(`    document_id: ${row.document_id ? row.document_id.substring(0, 8) + '...' : 'null'}`);
    console.log(`    locale: ${row.locale || 'null'}`);
    console.log(`    created_by_id: ${row.created_by_id || 'null'}`);
    console.log('');
  });

  // Final count
  const totalCount = await client.query('SELECT COUNT(*) as count FROM tabellen_eintraege');
  console.log(`📊 Total entries with fixed metadata: ${totalCount.rows[0].count}`);
}

// Run the fix
main().catch(console.error);