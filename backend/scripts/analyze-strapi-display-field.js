#!/usr/bin/env node

/**
 * Analyze current Strapi display field configuration for Tabellen-Eintrag
 * This script checks how Strapi determines the main display field
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function main() {
  console.log('🔍 Analyzing Strapi display field configuration...\n');

  try {
    // Step 1: Check current API response structure
    await checkAPIResponse();

    // Step 2: Check a specific entry to see field order
    await checkSpecificEntry();

    // Step 3: Analyze what Strapi uses as display field
    await analyzeDisplayField();

    console.log('\n✅ Analysis completed!');

  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
    process.exit(1);
  }
}

async function checkAPIResponse() {
  console.log('📡 Checking API response structure...\n');

  try {
    const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
      params: {
        populate: 'liga',
        'pagination[pageSize]': 3
      }
    });

    const entries = response.data.data;
    console.log(`Found ${entries.length} entries. Sample structure:\n`);

    entries.forEach((entry, index) => {
      console.log(`Entry ${index + 1}:`);
      console.log(`  - ID: ${entry.id}`);
      console.log(`  - documentId: ${entry.documentId}`);
      console.log(`  - team_name: "${entry.team_name}"`);
      console.log(`  - liga: ${entry.liga?.name || 'null'}`);
      console.log(`  - platz: ${entry.platz}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking API response:', error.message);
  }
}

async function checkSpecificEntry() {
  console.log('🔍 Checking specific entry details...\n');

  try {
    // Get first entry
    const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
      params: {
        populate: 'liga',
        'pagination[pageSize]': 1
      }
    });

    if (response.data.data.length > 0) {
      const entry = response.data.data[0];
      
      console.log('📋 First entry field order:');
      Object.keys(entry).forEach((key, index) => {
        console.log(`  ${index + 1}. ${key}: ${typeof entry[key] === 'object' ? JSON.stringify(entry[key]) : entry[key]}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking specific entry:', error.message);
  }
}

async function analyzeDisplayField() {
  console.log('\n🔍 Analyzing display field logic...\n');

  console.log('📊 Current situation:');
  console.log('  - In Strapi Admin Panel, entries are likely displayed by the first string field');
  console.log('  - Field order in schema.json determines priority');
  console.log('  - Currently "liga" (relation) appears before "team_name" (string)');
  console.log('  - Strapi probably uses "team_name" as display field since it\'s the first string field');
  console.log('');

  console.log('🎯 Problem:');
  console.log('  - User sees Liga name as title instead of Team name');
  console.log('  - This happens because Liga relation is populated and displayed prominently');
  console.log('  - Team name should be the primary identifier');
  console.log('');

  console.log('💡 Solution options:');
  console.log('  1. Reorder fields in schema.json (team_name before liga)');
  console.log('  2. Add mainField configuration to schema');
  console.log('  3. Customize admin panel display via admin extensions');
  console.log('');

  console.log('⚠️  Risk assessment:');
  console.log('  - Schema field reordering: LOW risk (only affects admin UI)');
  console.log('  - API responses remain unchanged');
  console.log('  - Frontend code unaffected');
  console.log('  - Database structure unchanged');
}

// Run the analysis
main().catch(console.error);