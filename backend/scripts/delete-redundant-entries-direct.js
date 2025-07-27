#!/usr/bin/env node

/**
 * Direct deletion of redundant entries via Strapi Admin API
 * This script uses the admin API to ensure proper deletion
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

// IDs of the redundant entries to remove
const REDUNDANT_ENTRY_IDS = [40, 41, 42];

async function main() {
  console.log('🗑️  Direct deletion of redundant entries...\n');

  try {
    // Step 1: Show current state
    await showCurrentState();

    // Step 2: Delete entries one by one
    await deleteEntriesDirectly();

    // Step 3: Verify final state
    await showFinalState();

    console.log('\n✅ Direct deletion completed!');

  } catch (error) {
    console.error('❌ Error during deletion:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

async function showCurrentState() {
  console.log('📊 Current state before deletion:\n');

  for (const id of REDUNDANT_ENTRY_IDS) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege/${id}`, {
        params: { populate: 'liga' }
      });

      const entry = response.data.data;
      console.log(`✅ Found entry ID ${id}:`);
      console.log(`   Name: "${entry.team_name}"`);
      console.log(`   Liga: ${entry.liga?.name || 'NO LIGA'}`);
      console.log(`   Position: ${entry.platz}`);
      console.log('');

    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`⚠️  Entry ID ${id} not found (may already be deleted)`);
      } else {
        console.log(`❌ Error checking entry ID ${id}: ${error.message}`);
      }
    }
  }
}

async function deleteEntriesDirectly() {
  console.log('🗑️  Deleting entries directly...\n');

  let successCount = 0;

  for (const id of REDUNDANT_ENTRY_IDS) {
    try {
      console.log(`Attempting to delete entry ID ${id}...`);
      
      const response = await axios.delete(`${API_BASE_URL}/api/tabellen-eintraege/${id}`);
      
      console.log(`✅ Successfully deleted entry ID ${id}`);
      console.log(`   Response status: ${response.status}`);
      successCount++;

    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`⚠️  Entry ID ${id} not found (may already be deleted)`);
      } else {
        console.error(`❌ Failed to delete entry ID ${id}:`);
        console.error(`   Status: ${error.response?.status || 'No response'}`);
        console.error(`   Message: ${error.message}`);
        if (error.response?.data) {
          console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
      }
    }
    console.log('');
  }

  console.log(`📊 Deletion summary: ${successCount}/${REDUNDANT_ENTRY_IDS.length} entries deleted`);
}

async function showFinalState() {
  console.log('\n🔍 Final state verification:\n');

  // Check if entries are really gone
  for (const id of REDUNDANT_ENTRY_IDS) {
    try {
      await axios.get(`${API_BASE_URL}/api/tabellen-eintraege/${id}`);
      console.error(`❌ Entry ID ${id} still exists!`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`✅ Confirmed: Entry ID ${id} is deleted`);
      } else {
        console.error(`❌ Error verifying deletion of ID ${id}: ${error.message}`);
      }
    }
  }

  // Show final counts
  console.log('\n📊 Final counts by Liga:');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
      params: {
        populate: 'liga',
        'pagination[pageSize]': 100
      }
    });

    const entries = response.data.data;
    console.log(`\n📈 Total entries now: ${entries.length} (should be 39 if deletion worked)`);

    // Group by liga
    const byLiga = {};
    entries.forEach(entry => {
      const ligaName = entry.liga?.name || 'NO LIGA';
      if (!byLiga[ligaName]) {
        byLiga[ligaName] = [];
      }
      byLiga[ligaName].push(entry);
    });

    Object.keys(byLiga).sort().forEach(ligaName => {
      console.log(`\n📍 ${ligaName}: ${byLiga[ligaName].length} teams`);
      
      // Show Viktoria team
      const viktoriaTeam = byLiga[ligaName].find(e => 
        (e.team_name.toLowerCase().includes('viktoria') || 
         e.team_name.toLowerCase().includes('vikt.')) &&
        !e.team_name.match(/^\d+\.\s*mannschaft$/i)
      );
      
      if (viktoriaTeam) {
        console.log(`   🟡 Viktoria: "${viktoriaTeam.team_name}" (Position: ${viktoriaTeam.platz})`);
      }

      // Check for remaining suspicious entries
      const suspiciousEntries = byLiga[ligaName].filter(e => 
        e.team_name.match(/^\d+\.\s*mannschaft$/i)
      );
      
      if (suspiciousEntries.length > 0) {
        console.log(`   ⚠️  Still ${suspiciousEntries.length} suspicious entries:`);
        suspiciousEntries.forEach(e => {
          console.log(`      - "${e.team_name}" (ID: ${e.id})`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Error getting final counts:', error.message);
  }
}

// Run the deletion
main().catch(console.error);