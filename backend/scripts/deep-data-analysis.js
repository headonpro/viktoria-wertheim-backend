#!/usr/bin/env node

/**
 * Deep analysis of all tabellen-eintrag data to find null/undefined values
 * that might cause Strapi admin panel errors
 */

const { Client } = require('pg');

async function main() {
  console.log('🔍 Deep data analysis for Strapi admin errors...\n');

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

    // Step 1: Check all fields for null values
    await checkAllFieldsForNulls(client);

    // Step 2: Check specific problematic patterns
    await checkProblematicPatterns(client);

    // Step 3: Check metadata fields
    await checkMetadataFields(client);

    // Step 4: Check for invalid data types
    await checkDataTypes(client);

    // Step 5: Generate fix suggestions
    await generateFixSuggestions(client);

    console.log('\n✅ Deep analysis completed!');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

async function checkAllFieldsForNulls(client) {
  console.log('\n🔍 Checking all fields for null values...\n');

  const result = await client.query(`
    SELECT 
      id,
      team_name,
      platz,
      spiele,
      siege,
      unentschieden,
      niederlagen,
      tore_fuer,
      tore_gegen,
      tordifferenz,
      punkte,
      created_at,
      updated_at,
      published_at,
      created_by_id,
      updated_by_id,
      document_id,
      locale
    FROM tabellen_eintraege
    ORDER BY id
  `);

  console.log(`📊 Analyzing ${result.rows.length} entries:\n`);

  const nullCounts = {};
  const problematicEntries = [];

  result.rows.forEach(row => {
    let hasNulls = false;
    const nullFields = [];

    Object.keys(row).forEach(field => {
      if (row[field] === null) {
        nullCounts[field] = (nullCounts[field] || 0) + 1;
        nullFields.push(field);
        hasNulls = true;
      }
    });

    if (hasNulls) {
      problematicEntries.push({
        id: row.id,
        team_name: row.team_name,
        nullFields: nullFields
      });
    }
  });

  console.log('📈 Null value counts by field:');
  Object.keys(nullCounts).forEach(field => {
    console.log(`  - ${field}: ${nullCounts[field]} null values`);
  });

  if (problematicEntries.length > 0) {
    console.log(`\n❌ Found ${problematicEntries.length} entries with null values:`);
    problematicEntries.forEach(entry => {
      console.log(`  - ID ${entry.id} (${entry.team_name}): ${entry.nullFields.join(', ')}`);
    });
  } else {
    console.log('\n✅ No entries with null values found');
  }
}

async function checkProblematicPatterns(client) {
  console.log('\n🔍 Checking for problematic patterns...\n');

  // Check for entries with missing document_id
  const missingDocumentId = await client.query(`
    SELECT id, team_name, document_id
    FROM tabellen_eintraege
    WHERE document_id IS NULL OR document_id = ''
  `);

  if (missingDocumentId.rows.length > 0) {
    console.log('❌ Entries missing document_id:');
    missingDocumentId.rows.forEach(row => {
      console.log(`  - ID ${row.id}: "${row.team_name}" (document_id: ${row.document_id})`);
    });
  } else {
    console.log('✅ All entries have document_id');
  }

  // Check for entries with missing locale
  const missingLocale = await client.query(`
    SELECT id, team_name, locale
    FROM tabellen_eintraege
    WHERE locale IS NULL OR locale = ''
  `);

  if (missingLocale.rows.length > 0) {
    console.log('❌ Entries missing locale:');
    missingLocale.rows.forEach(row => {
      console.log(`  - ID ${row.id}: "${row.team_name}" (locale: ${row.locale})`);
    });
  } else {
    console.log('✅ All entries have locale');
  }

  // Check for entries with missing published_at
  const missingPublishedAt = await client.query(`
    SELECT id, team_name, published_at
    FROM tabellen_eintraege
    WHERE published_at IS NULL
  `);

  if (missingPublishedAt.rows.length > 0) {
    console.log('❌ Unpublished entries:');
    missingPublishedAt.rows.forEach(row => {
      console.log(`  - ID ${row.id}: "${row.team_name}"`);
    });
  } else {
    console.log('✅ All entries are published');
  }
}

async function checkMetadataFields(client) {
  console.log('\n🔍 Checking metadata fields...\n');

  const result = await client.query(`
    SELECT 
      id,
      team_name,
      created_at,
      updated_at,
      created_by_id,
      updated_by_id
    FROM tabellen_eintraege
    WHERE created_at IS NULL 
       OR updated_at IS NULL 
       OR created_by_id IS NULL 
       OR updated_by_id IS NULL
    ORDER BY id
  `);

  if (result.rows.length > 0) {
    console.log('❌ Entries with missing metadata:');
    result.rows.forEach(row => {
      const missing = [];
      if (!row.created_at) missing.push('created_at');
      if (!row.updated_at) missing.push('updated_at');
      if (!row.created_by_id) missing.push('created_by_id');
      if (!row.updated_by_id) missing.push('updated_by_id');
      
      console.log(`  - ID ${row.id} (${row.team_name}): missing ${missing.join(', ')}`);
    });
  } else {
    console.log('✅ All entries have complete metadata');
  }
}

async function checkDataTypes(client) {
  console.log('\n🔍 Checking data types and ranges...\n');

  // Check for invalid positions
  const invalidPositions = await client.query(`
    SELECT id, team_name, platz
    FROM tabellen_eintraege
    WHERE platz IS NULL OR platz < 1 OR platz > 50
  `);

  if (invalidPositions.rows.length > 0) {
    console.log('❌ Invalid positions:');
    invalidPositions.rows.forEach(row => {
      console.log(`  - ID ${row.id} (${row.team_name}): position ${row.platz}`);
    });
  } else {
    console.log('✅ All positions are valid');
  }

  // Check for negative values in numeric fields
  const negativeValues = await client.query(`
    SELECT id, team_name, spiele, siege, unentschieden, niederlagen, tore_fuer, tore_gegen, punkte
    FROM tabellen_eintraege
    WHERE spiele < 0 OR siege < 0 OR unentschieden < 0 OR niederlagen < 0 
       OR tore_fuer < 0 OR tore_gegen < 0 OR punkte < 0
  `);

  if (negativeValues.rows.length > 0) {
    console.log('❌ Negative values found:');
    negativeValues.rows.forEach(row => {
      console.log(`  - ID ${row.id} (${row.team_name}): check numeric fields`);
    });
  } else {
    console.log('✅ No negative values found');
  }
}

async function generateFixSuggestions(client) {
  console.log('\n🔧 Fix suggestions:\n');

  // Count total issues
  const issueChecks = [
    { query: "SELECT COUNT(*) as count FROM tabellen_eintraege WHERE document_id IS NULL", name: "Missing document_id" },
    { query: "SELECT COUNT(*) as count FROM tabellen_eintraege WHERE locale IS NULL", name: "Missing locale" },
    { query: "SELECT COUNT(*) as count FROM tabellen_eintraege WHERE published_at IS NULL", name: "Unpublished entries" },
    { query: "SELECT COUNT(*) as count FROM tabellen_eintraege WHERE created_by_id IS NULL", name: "Missing created_by_id" },
    { query: "SELECT COUNT(*) as count FROM tabellen_eintraege WHERE updated_by_id IS NULL", name: "Missing updated_by_id" }
  ];

  let totalIssues = 0;
  for (const check of issueChecks) {
    const result = await client.query(check.query);
    const count = parseInt(result.rows[0].count);
    if (count > 0) {
      console.log(`❌ ${check.name}: ${count} entries`);
      totalIssues += count;
    }
  }

  if (totalIssues === 0) {
    console.log('✅ No data integrity issues found');
    console.log('\n💡 The admin panel error might be caused by:');
    console.log('1. Browser cache - try hard refresh (Ctrl+F5)');
    console.log('2. Strapi cache - restart the backend');
    console.log('3. Database connection issues');
    console.log('4. Strapi version compatibility');
  } else {
    console.log(`\n📊 Total issues found: ${totalIssues}`);
    console.log('\n💡 Recommended fixes:');
    console.log('1. Run the comprehensive fix script');
    console.log('2. Regenerate missing metadata');
    console.log('3. Ensure all entries are properly published');
    console.log('4. Restart Strapi after fixes');
  }
}

// Run the analysis
main().catch(console.error);