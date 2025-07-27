#!/usr/bin/env node

/**
 * Analyze suspicious entries that might be redundant
 * Focus on entries like "1. Mannschaft", "2. Mannschaft", etc.
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function main() {
  console.log('🔍 Analyzing suspicious/redundant entries...\n');

  try {
    const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
      params: {
        populate: 'liga',
        'pagination[pageSize]': 100
      }
    });

    const entries = response.data.data;
    console.log(`📊 Total entries: ${entries.length}\n`);

    // Find suspicious entries
    await findSuspiciousEntries(entries);
    
    // Find potential Viktoria duplicates
    await findViktoriaRelatedEntries(entries);

    // Show all entries by liga for manual review
    await showAllEntriesByLiga(entries);

    console.log('\n✅ Analysis completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function findSuspiciousEntries(entries) {
  console.log('🚨 Suspicious entries (generic team names):');
  
  const suspiciousPatterns = [
    /^\d+\.\s*mannschaft$/i,
    /^mannschaft\s*\d+$/i,
    /^team\s*\d+$/i,
    /^erste?\s*mannschaft$/i,
    /^zweite?\s*mannschaft$/i,
    /^dritte?\s*mannschaft$/i
  ];

  const suspiciousEntries = entries.filter(entry => {
    return suspiciousPatterns.some(pattern => pattern.test(entry.team_name));
  });

  if (suspiciousEntries.length === 0) {
    console.log('  ✅ No suspicious generic team names found');
  } else {
    console.log(`  ❌ Found ${suspiciousEntries.length} suspicious entries:\n`);
    
    suspiciousEntries.forEach((entry, index) => {
      console.log(`  ${index + 1}. "${entry.team_name}" (ID: ${entry.id})`);
      console.log(`     Liga: ${entry.liga?.name || 'NO LIGA'}`);
      console.log(`     Position: ${entry.platz}, Points: ${entry.punkte}`);
      console.log(`     Created: ${entry.createdAt}`);
      console.log(`     Updated: ${entry.updatedAt}`);
      console.log('');
    });
  }
}

async function findViktoriaRelatedEntries(entries) {
  console.log('🟡 All Viktoria-related entries:');
  
  const viktoriaEntries = entries.filter(entry => {
    const name = entry.team_name.toLowerCase();
    return name.includes('viktoria') || 
           name.includes('vikt.') ||
           name.match(/^\d+\.\s*mannschaft$/i) ||
           name.match(/^mannschaft\s*\d+$/i);
  });

  if (viktoriaEntries.length === 0) {
    console.log('  ❌ No Viktoria-related entries found');
  } else {
    console.log(`  Found ${viktoriaEntries.length} Viktoria-related entries:\n`);
    
    // Group by liga
    const byLiga = {};
    viktoriaEntries.forEach(entry => {
      const ligaName = entry.liga?.name || 'NO LIGA';
      if (!byLiga[ligaName]) {
        byLiga[ligaName] = [];
      }
      byLiga[ligaName].push(entry);
    });

    Object.keys(byLiga).forEach(ligaName => {
      console.log(`  📍 ${ligaName}:`);
      byLiga[ligaName].forEach(entry => {
        console.log(`    - "${entry.team_name}" (ID: ${entry.id})`);
        console.log(`      Position: ${entry.platz}, Points: ${entry.punkte}`);
        console.log(`      Created: ${new Date(entry.createdAt).toLocaleDateString('de-DE')}`);
      });
      console.log('');
    });
  }
}

async function showAllEntriesByLiga(entries) {
  console.log('📋 All entries by Liga (for manual review):');
  
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
    console.log(`\n📍 ${ligaName} (${byLiga[ligaName].length} teams):`);
    
    // Sort by position
    const sortedEntries = byLiga[ligaName].sort((a, b) => (a.platz || 999) - (b.platz || 999));
    
    sortedEntries.forEach((entry, index) => {
      const isViktoria = entry.team_name.toLowerCase().includes('viktoria') || 
                        entry.team_name.toLowerCase().includes('vikt.') ||
                        entry.team_name.match(/^\d+\.\s*mannschaft$/i);
      
      const marker = isViktoria ? '🟡' : '  ';
      console.log(`${marker} ${entry.platz || '?'}. ${entry.team_name} (ID: ${entry.id})`);
      
      if (entry.team_name.match(/^\d+\.\s*mannschaft$/i)) {
        console.log(`     ⚠️  SUSPICIOUS: Generic team name - likely redundant!`);
      }
    });
  });
}

// Run the analysis
main().catch(console.error);