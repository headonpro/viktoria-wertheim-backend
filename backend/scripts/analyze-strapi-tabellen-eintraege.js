#!/usr/bin/env node

/**
 * Analyze Tabellen-Einträge via Strapi API
 * This script checks what the Strapi API returns vs what's in the database
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function main() {
  console.log('🔍 Analyzing Tabellen-Einträge via Strapi API...\n');

  try {
    // Step 1: Get all entries via Strapi API
    await analyzeViaAPI();

    // Step 2: Check specific endpoints
    await checkSpecificEndpoints();

    console.log('\n✅ API Analysis completed!');

  } catch (error) {
    console.error('❌ Error during API analysis:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

async function analyzeViaAPI() {
  console.log('📡 Fetching data via Strapi API...');
  
  try {
    // Get all tabellen-eintraege with population
    const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
      params: {
        populate: 'liga',
        'pagination[pageSize]': 100
      }
    });

    const entries = response.data.data;
    console.log(`\n📊 API returned ${entries.length} entries`);

    // Group by team name and liga
    const groupedEntries = {};
    entries.forEach(entry => {
      const teamName = entry.team_name;
      const ligaName = entry.liga?.name || 'NO LIGA';
      const key = `${teamName}|${ligaName}`;
      
      if (!groupedEntries[key]) {
        groupedEntries[key] = [];
      }
      groupedEntries[key].push(entry);
    });

    // Find duplicates
    const duplicates = Object.keys(groupedEntries).filter(key => groupedEntries[key].length > 1);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found via API');
    } else {
      console.log(`❌ Found ${duplicates.length} teams with duplicates via API:\n`);
      
      duplicates.forEach(key => {
        const [teamName, ligaName] = key.split('|');
        const entries = groupedEntries[key];
        
        console.log(`${teamName} in ${ligaName} (${entries.length} entries):`);
        entries.forEach((entry, index) => {
          console.log(`  ${index + 1}. ID: ${entry.id}, DocumentID: ${entry.documentId}`);
          console.log(`     Position: ${entry.platz}, Points: ${entry.punkte}`);
          console.log(`     Created: ${entry.createdAt}`);
          console.log(`     Updated: ${entry.updatedAt}`);
        });
        console.log('');
      });
    }

    // Show distribution by liga
    console.log('\n📊 Distribution by Liga (via API):');
    const ligaDistribution = {};
    entries.forEach(entry => {
      const ligaName = entry.liga?.name || 'NO LIGA';
      if (!ligaDistribution[ligaName]) {
        ligaDistribution[ligaName] = {
          total: 0,
          teams: new Set()
        };
      }
      ligaDistribution[ligaName].total++;
      ligaDistribution[ligaName].teams.add(entry.team_name);
    });

    Object.keys(ligaDistribution).forEach(ligaName => {
      const data = ligaDistribution[ligaName];
      console.log(`  - ${ligaName}:`);
      console.log(`    Total entries: ${data.total}`);
      console.log(`    Unique teams: ${data.teams.size}`);
      console.log(`    Duplicates: ${data.total - data.teams.size}`);
    });

    // Show Viktoria teams
    console.log('\n🟡 Viktoria teams (via API):');
    const viktoriaEntries = entries.filter(entry => 
      entry.team_name && entry.team_name.toLowerCase().includes('viktoria')
    );
    
    if (viktoriaEntries.length === 0) {
      console.log('  ❌ No Viktoria teams found via API!');
    } else {
      viktoriaEntries.forEach(entry => {
        console.log(`  - ${entry.team_name} (ID: ${entry.id})`);
        console.log(`    Liga: ${entry.liga?.name || 'NO LIGA'}`);
        console.log(`    Position: ${entry.platz}, Points: ${entry.punkte}`);
        console.log('');
      });
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to Strapi API. Is the backend running on http://localhost:1337?');
    } else {
      throw error;
    }
  }
}

async function checkSpecificEndpoints() {
  console.log('\n🔍 Checking specific liga endpoints...');
  
  const ligas = [
    'Kreisliga Tauberbischofsheim',
    'Kreisklasse A Tauberbischofsheim', 
    'Kreisklasse B Tauberbischofsheim'
  ];

  for (const ligaName of ligas) {
    try {
      console.log(`\n📡 Checking ${ligaName}...`);
      
      // Try optimized endpoint first
      let response;
      try {
        response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege/liga/${encodeURIComponent(ligaName)}`);
        console.log(`  ✅ Optimized endpoint returned ${response.data.data?.length || 0} entries`);
      } catch (optimizedError) {
        console.log(`  ⚠️  Optimized endpoint failed, trying standard endpoint...`);
        
        // Fallback to standard endpoint
        response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
          params: {
            'filters[liga][name][$eq]': ligaName,
            populate: 'liga',
            sort: 'platz:asc'
          }
        });
        console.log(`  ✅ Standard endpoint returned ${response.data.data?.length || 0} entries`);
      }

      const entries = response.data.data || [];
      if (entries.length > 0) {
        console.log(`    Teams: ${entries.map(e => e.team_name).join(', ')}`);
      }

    } catch (error) {
      console.error(`  ❌ Error checking ${ligaName}:`, error.message);
    }
  }
}

// Run the analysis
main().catch(console.error);