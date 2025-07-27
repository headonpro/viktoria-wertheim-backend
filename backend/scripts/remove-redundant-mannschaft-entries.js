#!/usr/bin/env node

/**
 * Remove redundant "X. Mannschaft" entries
 * These are duplicates of the proper Viktoria team entries
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

// IDs of the redundant entries to remove
const REDUNDANT_ENTRIES = [
  { id: 40, name: '1. Mannschaft', liga: 'Kreisliga Tauberbischofsheim', reason: 'Duplicate of "SV Viktoria Wertheim"' },
  { id: 41, name: '2. Mannschaft', liga: 'Kreisklasse A Tauberbischofsheim', reason: 'Duplicate of "SV Viktoria Wertheim II"' },
  { id: 42, name: '3. Mannschaft', liga: 'Kreisklasse B Tauberbischofsheim', reason: 'Duplicate of "SpG Vikt. Wertheim 3/Grünenwort"' }
];

async function main() {
  console.log('🗑️  Removing redundant Mannschaft entries...\n');

  try {
    // Step 1: Verify entries exist and show what will be deleted
    await verifyEntriesBeforeDeletion();

    // Step 2: Ask for confirmation (in a real scenario)
    console.log('⚠️  WARNING: This will permanently delete the redundant entries!');
    console.log('   Make sure you have a backup before proceeding.\n');

    // Step 3: Delete the redundant entries
    await deleteRedundantEntries();

    // Step 4: Verify deletion
    await verifyDeletion();

    console.log('\n✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

async function verifyEntriesBeforeDeletion() {
  console.log('🔍 Verifying entries before deletion...\n');

  for (const entry of REDUNDANT_ENTRIES) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege/${entry.id}`, {
        params: { populate: 'liga' }
      });

      const data = response.data.data;
      console.log(`✅ Found entry to delete:`);
      console.log(`   ID: ${data.id}`);
      console.log(`   Name: "${data.team_name}"`);
      console.log(`   Liga: ${data.liga?.name || 'NO LIGA'}`);
      console.log(`   Position: ${data.platz}`);
      console.log(`   Reason: ${entry.reason}`);
      console.log('');

    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`⚠️  Entry ${entry.id} ("${entry.name}") not found - may already be deleted`);
      } else {
        console.error(`❌ Error checking entry ${entry.id}:`, error.message);
      }
    }
  }
}

async function deleteRedundantEntries() {
  console.log('🗑️  Deleting redundant entries...\n');

  let deletedCount = 0;

  for (const entry of REDUNDANT_ENTRIES) {
    try {
      await axios.delete(`${API_BASE_URL}/api/tabellen-eintraege/${entry.id}`);
      console.log(`✅ Deleted: "${entry.name}" (ID: ${entry.id}) from ${entry.liga}`);
      deletedCount++;

    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`⚠️  Entry ${entry.id} ("${entry.name}") not found - may already be deleted`);
      } else {
        console.error(`❌ Failed to delete entry ${entry.id} ("${entry.name}"):`, error.message);
      }
    }
  }

  console.log(`\n📊 Deleted ${deletedCount} out of ${REDUNDANT_ENTRIES.length} redundant entries`);
}

async function verifyDeletion() {
  console.log('\n🔍 Verifying deletion...\n');

  // Check that the entries are gone
  for (const entry of REDUNDANT_ENTRIES) {
    try {
      await axios.get(`${API_BASE_URL}/api/tabellen-eintraege/${entry.id}`);
      console.error(`❌ Entry ${entry.id} ("${entry.name}") still exists!`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`✅ Confirmed deleted: "${entry.name}" (ID: ${entry.id})`);
      } else {
        console.error(`❌ Error verifying deletion of entry ${entry.id}:`, error.message);
      }
    }
  }

  // Show final count by liga
  console.log('\n📊 Final team counts by Liga:');
  
  const ligas = [
    'Kreisliga Tauberbischofsheim',
    'Kreisklasse A Tauberbischofsheim',
    'Kreisklasse B Tauberbischofsheim'
  ];

  for (const ligaName of ligas) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
        params: {
          'filters[liga][name][$eq]': ligaName,
          populate: 'liga'
        }
      });

      const entries = response.data.data;
      console.log(`  - ${ligaName}: ${entries.length} teams`);
      
      // Show Viktoria team in this liga
      const viktoriaTeam = entries.find(e => 
        e.team_name.toLowerCase().includes('viktoria') || 
        e.team_name.toLowerCase().includes('vikt.')
      );
      
      if (viktoriaTeam) {
        console.log(`    🟡 Viktoria team: "${viktoriaTeam.team_name}" (Position: ${viktoriaTeam.platz})`);
      }

    } catch (error) {
      console.error(`❌ Error checking ${ligaName}:`, error.message);
    }
  }
}

// Run the cleanup
main().catch(console.error);