#!/usr/bin/env node

/**
 * Seed Complete League Tables
 * 
 * This script populates the tabellen_eintraege table with complete league standings
 * for all three leagues, including all teams mentioned in the LeagueTable component.
 */

const axios = require('axios');

// API Configuration
const API_BASE_URL = 'http://localhost:1337';

// Complete team data for all three leagues
const LEAGUE_DATA = {
  'Kreisliga Tauberbischofsheim': [
    { name: 'VfR Gerlachsheim', position: 1, games: 15, wins: 12, draws: 2, losses: 1, goalsFor: 45, goalsAgainst: 12, points: 38 },
    { name: 'TSV Jahn Kreuzwertheim', position: 2, games: 15, wins: 11, draws: 1, losses: 3, goalsFor: 38, goalsAgainst: 18, points: 34 },
    { name: 'TSV Assamstadt', position: 3, games: 15, wins: 10, draws: 3, losses: 2, goalsFor: 42, goalsAgainst: 20, points: 33 },
    { name: 'FV Brehmbachtal', position: 4, games: 15, wins: 9, draws: 4, losses: 2, goalsFor: 35, goalsAgainst: 18, points: 31 },
    { name: 'FC Hundheim-Steinbach', position: 5, games: 15, wins: 8, draws: 3, losses: 4, goalsFor: 32, goalsAgainst: 22, points: 27 },
    { name: 'TuS Großrinderfeld', position: 6, games: 15, wins: 7, draws: 4, losses: 4, goalsFor: 28, goalsAgainst: 25, points: 25 },
    { name: 'SV Viktoria Wertheim', position: 7, games: 15, wins: 6, draws: 5, losses: 4, goalsFor: 26, goalsAgainst: 24, points: 23 },
    { name: 'Türk Gücü Wertheim', position: 8, games: 15, wins: 6, draws: 3, losses: 6, goalsFor: 24, goalsAgainst: 28, points: 21 },
    { name: 'SV Pülfringen', position: 9, games: 15, wins: 5, draws: 4, losses: 6, goalsFor: 22, goalsAgainst: 26, points: 19 },
    { name: 'VfB Reicholzheim', position: 10, games: 15, wins: 4, draws: 6, losses: 5, goalsFor: 20, goalsAgainst: 25, points: 18 },
    { name: 'FC Rauenberg', position: 11, games: 15, wins: 4, draws: 3, losses: 8, goalsFor: 18, goalsAgainst: 32, points: 15 },
    { name: 'SV Schönfeld', position: 12, games: 15, wins: 3, draws: 4, losses: 8, goalsFor: 16, goalsAgainst: 30, points: 13 },
    { name: 'TSG Impfingen II', position: 13, games: 15, wins: 3, draws: 2, losses: 10, goalsFor: 15, goalsAgainst: 35, points: 11 },
    { name: '1. FC Umpfertal', position: 14, games: 15, wins: 2, draws: 3, losses: 10, goalsFor: 12, goalsAgainst: 38, points: 9 },
    { name: 'Kickers DHK Wertheim', position: 15, games: 15, wins: 1, draws: 2, losses: 12, goalsFor: 10, goalsAgainst: 42, points: 5 },
    { name: 'TSV Schwabhausen', position: 16, games: 15, wins: 0, draws: 3, losses: 12, goalsFor: 8, goalsAgainst: 45, points: 3 }
  ],
  
  'Kreisklasse A Tauberbischofsheim': [
    { name: 'TSV Unterschüpf', position: 1, games: 14, wins: 11, draws: 2, losses: 1, goalsFor: 38, goalsAgainst: 12, points: 35 },
    { name: 'SV Nassig II', position: 2, games: 14, wins: 10, draws: 3, losses: 1, goalsFor: 35, goalsAgainst: 15, points: 33 },
    { name: 'TSV Dittwar', position: 3, games: 14, wins: 9, draws: 2, losses: 3, goalsFor: 32, goalsAgainst: 18, points: 29 },
    { name: 'FV Oberlauda e.V.', position: 4, games: 14, wins: 8, draws: 4, losses: 2, goalsFor: 28, goalsAgainst: 16, points: 28 },
    { name: 'FC Wertheim-Eichel', position: 5, games: 14, wins: 7, draws: 3, losses: 4, goalsFor: 25, goalsAgainst: 20, points: 24 },
    { name: 'SV Viktoria Wertheim II', position: 6, games: 14, wins: 6, draws: 4, losses: 4, goalsFor: 22, goalsAgainst: 21, points: 22 },
    { name: 'TSV Assamstadt II', position: 7, games: 14, wins: 6, draws: 2, losses: 6, goalsFor: 20, goalsAgainst: 24, points: 20 },
    { name: 'FC Grünsfeld II', position: 8, games: 14, wins: 5, draws: 4, losses: 5, goalsFor: 18, goalsAgainst: 22, points: 19 },
    { name: 'TSV Gerchsheim', position: 9, games: 14, wins: 5, draws: 3, losses: 6, goalsFor: 17, goalsAgainst: 25, points: 18 },
    { name: 'SV Distelhausen II', position: 10, games: 14, wins: 4, draws: 5, losses: 5, goalsFor: 16, goalsAgainst: 23, points: 17 },
    { name: 'TSV Wenkheim', position: 11, games: 14, wins: 4, draws: 3, losses: 7, goalsFor: 15, goalsAgainst: 28, points: 15 },
    { name: 'SV Winzer Beckstein II', position: 12, games: 14, wins: 3, draws: 4, losses: 7, goalsFor: 14, goalsAgainst: 26, points: 13 },
    { name: 'SV Oberbalbach', position: 13, games: 14, wins: 2, draws: 5, losses: 7, goalsFor: 12, goalsAgainst: 28, points: 11 },
    { name: 'FSV Tauberhöhe II', position: 14, games: 14, wins: 1, draws: 3, losses: 10, goalsFor: 10, goalsAgainst: 32, points: 6 }
  ],
  
  'Kreisklasse B Tauberbischofsheim': [
    { name: 'FC Hundheim-Steinbach 2', position: 1, games: 12, wins: 10, draws: 1, losses: 1, goalsFor: 32, goalsAgainst: 8, points: 31 },
    { name: 'FC Wertheim-Eichel 2', position: 2, games: 12, wins: 8, draws: 3, losses: 1, goalsFor: 28, goalsAgainst: 12, points: 27 },
    { name: 'SG RaMBo 2', position: 3, games: 12, wins: 7, draws: 4, losses: 1, goalsFor: 24, goalsAgainst: 10, points: 25 },
    { name: 'SV Eintracht Nassig 3', position: 4, games: 12, wins: 6, draws: 3, losses: 3, goalsFor: 20, goalsAgainst: 16, points: 21 },
    { name: 'SpG Vikt. Wertheim 3/Grünenwort', position: 5, games: 12, wins: 5, draws: 4, losses: 3, goalsFor: 18, goalsAgainst: 15, points: 19 },
    { name: 'SpG Kickers DHK Wertheim 2/Urphar', position: 6, games: 12, wins: 5, draws: 2, losses: 5, goalsFor: 16, goalsAgainst: 18, points: 17 },
    { name: 'TSV Kreuzwertheim 2', position: 7, games: 12, wins: 4, draws: 4, losses: 4, goalsFor: 15, goalsAgainst: 17, points: 16 },
    { name: 'Turkgucu Wertheim 2', position: 8, games: 12, wins: 4, draws: 2, losses: 6, goalsFor: 14, goalsAgainst: 20, points: 14 },
    { name: 'VfB Reicholzheim 2', position: 9, games: 12, wins: 2, draws: 3, losses: 7, goalsFor: 12, goalsAgainst: 24, points: 9 }
  ]
};

async function findOrCreateLiga(ligaName) {
  try {
    // First, try to find existing liga
    const searchResponse = await axios.get(`${API_BASE_URL}/api/ligas`, {
      params: {
        'filters[name][$eq]': ligaName
      }
    });

    if (searchResponse.data.data && searchResponse.data.data.length > 0) {
      console.log(`✓ Liga found: ${ligaName}`);
      return searchResponse.data.data[0];
    }

    // Create new liga if not found
    const createResponse = await axios.post(`${API_BASE_URL}/api/ligas`, {
      data: {
        name: ligaName,
        kurz_name: ligaName.replace('Tauberbischofsheim', 'TBB')
      }
    });

    console.log(`✓ Liga created: ${ligaName}`);
    return createResponse.data.data;

  } catch (error) {
    console.error(`✗ Error with liga ${ligaName}:`, error.response?.data || error.message);
    throw error;
  }
}

async function createTabellenEintrag(teamData, liga) {
  try {
    const tordifferenz = teamData.goalsFor - teamData.goalsAgainst;
    
    const response = await axios.post(`${API_BASE_URL}/api/tabellen-eintraege`, {
      data: {
        team_name: teamData.name,
        platz: teamData.position,
        spiele: teamData.games,
        siege: teamData.wins,
        unentschieden: teamData.draws,
        niederlagen: teamData.losses,
        tore_fuer: teamData.goalsFor,
        tore_gegen: teamData.goalsAgainst,
        tordifferenz: tordifferenz,
        punkte: teamData.points,
        liga: liga.id
      }
    });

    console.log(`  ✓ Created: ${teamData.name} (Position ${teamData.position})`);
    return response.data.data;

  } catch (error) {
    console.error(`  ✗ Error creating ${teamData.name}:`, error.response?.data || error.message);
    throw error;
  }
}

async function clearExistingData() {
  try {
    console.log('\n🗑️  Clearing existing tabellen_eintraege...');
    
    // Get all existing entries
    const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`);
    const entries = response.data.data || [];

    // Delete each entry
    for (const entry of entries) {
      await axios.delete(`${API_BASE_URL}/api/tabellen-eintraege/${entry.id}`);
      console.log(`  ✓ Deleted: ${entry.team_name}`);
    }

    console.log(`✓ Cleared ${entries.length} existing entries`);

  } catch (error) {
    console.error('✗ Error clearing existing data:', error.response?.data || error.message);
    throw error;
  }
}

async function seedCompleteLeagueTables() {
  console.log('🌱 Starting complete league tables seeding...\n');

  try {
    // Clear existing data first
    await clearExistingData();

    // Process each league
    for (const [ligaName, teams] of Object.entries(LEAGUE_DATA)) {
      console.log(`\n📊 Processing ${ligaName}...`);
      
      // Find or create liga
      const liga = await findOrCreateLiga(ligaName);
      
      // Create tabellen entries for all teams
      console.log(`  Creating ${teams.length} teams...`);
      for (const teamData of teams) {
        await createTabellenEintrag(teamData, liga);
      }
      
      console.log(`✓ Completed ${ligaName} with ${teams.length} teams`);
    }

    console.log('\n🎉 Complete league tables seeding completed successfully!');
    console.log('\nSummary:');
    Object.entries(LEAGUE_DATA).forEach(([ligaName, teams]) => {
      console.log(`  - ${ligaName}: ${teams.length} teams`);
    });

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

// Run the seeding
if (require.main === module) {
  seedCompleteLeagueTables();
}

module.exports = { seedCompleteLeagueTables, LEAGUE_DATA };