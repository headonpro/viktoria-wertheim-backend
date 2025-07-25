const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337/api';

// Sample data for teams with new fields
const sampleTeams = [
  // Viktoria Teams (update existing)
  {
    name: '1. Mannschaft',
    form_letzte_5: 'SUNSS',
    team_typ: 'viktoria_mannschaft',
    liga_name: 'Kreisliga Tauberbischofsheim',
    trend: 'neutral',
    tabellenplatz: 8,
    punkte: 24,
    spiele_gesamt: 18,
    siege: 7,
    unentschieden: 3,
    niederlagen: 8,
    tore_fuer: 32,
    tore_gegen: 28,
    tordifferenz: 4
  },
  {
    name: '2. Mannschaft',
    form_letzte_5: 'NUSSU',
    team_typ: 'viktoria_mannschaft',
    liga_name: 'Kreisklasse A Tauberbischofsheim',
    trend: 'steigend',
    tabellenplatz: 5,
    punkte: 28,
    spiele_gesamt: 16,
    siege: 8,
    unentschieden: 4,
    niederlagen: 4,
    tore_fuer: 35,
    tore_gegen: 22,
    tordifferenz: 13
  },
  {
    name: '3. Mannschaft',
    form_letzte_5: 'NNNSU',
    team_typ: 'viktoria_mannschaft',
    liga_name: 'Kreisklasse B Tauberbischofsheim',
    trend: 'fallend',
    tabellenplatz: 12,
    punkte: 15,
    spiele_gesamt: 14,
    siege: 4,
    unentschieden: 3,
    niederlagen: 7,
    tore_fuer: 18,
    tore_gegen: 31,
    tordifferenz: -13
  },
  // Opponent teams for Kreisliga
  {
    name: 'FC Eichel',
    team_typ: 'gegner_verein',
    liga_name: 'Kreisliga Tauberbischofsheim',
    tabellenplatz: 1,
    punkte: 45,
    spiele_gesamt: 18,
    siege: 14,
    unentschieden: 3,
    niederlagen: 1,
    tore_fuer: 52,
    tore_gegen: 18,
    tordifferenz: 34,
    form_letzte_5: 'SSSSS'
  },
  {
    name: 'TSV Assamstadt',
    team_typ: 'gegner_verein',
    liga_name: 'Kreisliga Tauberbischofsheim',
    tabellenplatz: 2,
    punkte: 38,
    spiele_gesamt: 18,
    siege: 12,
    unentschieden: 2,
    niederlagen: 4,
    tore_fuer: 41,
    tore_gegen: 22,
    tordifferenz: 19,
    form_letzte_5: 'SSSUN'
  },
  {
    name: 'Türkgücü Wertheim',
    team_typ: 'gegner_verein',
    liga_name: 'Kreisliga Tauberbischofsheim',
    tabellenplatz: 3,
    punkte: 35,
    spiele_gesamt: 18,
    siege: 11,
    unentschieden: 2,
    niederlagen: 5,
    tore_fuer: 38,
    tore_gegen: 25,
    tordifferenz: 13,
    form_letzte_5: 'SUSSS'
  },
  {
    name: 'TSV Tauberbischofsheim',
    team_typ: 'gegner_verein',
    liga_name: 'Kreisliga Tauberbischofsheim',
    tabellenplatz: 4,
    punkte: 32,
    spiele_gesamt: 18,
    siege: 10,
    unentschieden: 2,
    niederlagen: 6,
    tore_fuer: 35,
    tore_gegen: 28,
    tordifferenz: 7,
    form_letzte_5: 'SUSNS'
  },
  {
    name: 'FV Brehmbachtal',
    team_typ: 'gegner_verein',
    liga_name: 'Kreisliga Tauberbischofsheim',
    tabellenplatz: 5,
    punkte: 30,
    spiele_gesamt: 18,
    siege: 9,
    unentschieden: 3,
    niederlagen: 6,
    tore_fuer: 33,
    tore_gegen: 29,
    tordifferenz: 4,
    form_letzte_5: 'UNSUS'
  },
  {
    name: 'SV Pülfringen',
    team_typ: 'gegner_verein',
    liga_name: 'Kreisliga Tauberbischofsheim',
    tabellenplatz: 6,
    punkte: 28,
    spiele_gesamt: 18,
    siege: 8,
    unentschieden: 4,
    niederlagen: 6,
    tore_fuer: 30,
    tore_gegen: 28,
    tordifferenz: 2,
    form_letzte_5: 'USUNN'
  },
  {
    name: 'TSV Kreuzwertheim',
    team_typ: 'gegner_verein',
    liga_name: 'Kreisliga Tauberbischofsheim',
    tabellenplatz: 7,
    punkte: 26,
    spiele_gesamt: 18,
    siege: 8,
    unentschieden: 2,
    niederlagen: 8,
    tore_fuer: 29,
    tore_gegen: 30,
    tordifferenz: -1,
    form_letzte_5: 'NSSNU'
  },
  // SV Viktoria Wertheim is position 8 (already defined above)
  {
    name: 'FC Hundheim-Steinbach',
    team_typ: 'gegner_verein',
    liga_name: 'Kreisliga Tauberbischofsheim',
    tabellenplatz: 9,
    punkte: 22,
    spiele_gesamt: 18,
    siege: 6,
    unentschieden: 4,
    niederlagen: 8,
    tore_fuer: 26,
    tore_gegen: 32,
    tordifferenz: -6,
    form_letzte_5: 'NUNNS'
  },
  {
    name: 'SpG Schwabhausen/Windischbuch',
    team_typ: 'gegner_verein',
    liga_name: 'Kreisliga Tauberbischofsheim',
    tabellenplatz: 10,
    punkte: 20,
    spiele_gesamt: 18,
    siege: 6,
    unentschieden: 2,
    niederlagen: 10,
    tore_fuer: 24,
    tore_gegen: 36,
    tordifferenz: -12,
    form_letzte_5: 'NNNSU'
  }
];

// Sample player statistics
const samplePlayerStats = [
  // Viktoria players
  { name: 'Thomas Müller', team_name: 'Viktoria Wertheim', tore: 12, spiele: 18, ist_viktoria_spieler: true },
  { name: 'Michael Schmidt', team_name: 'Viktoria Wertheim', tore: 9, spiele: 18, ist_viktoria_spieler: true },
  { name: 'Stefan Braun', team_name: 'Viktoria Wertheim', tore: 7, spiele: 17, ist_viktoria_spieler: true },
  { name: 'Daniel Fischer', team_name: 'Viktoria Wertheim', tore: 5, spiele: 16, ist_viktoria_spieler: true },
  { name: 'Florian Keller', team_name: 'Viktoria Wertheim', tore: 4, spiele: 18, ist_viktoria_spieler: true },
  
  // Opponent players
  { name: 'Andreas Weber', team_name: 'FC Eichel', tore: 15, spiele: 16, ist_viktoria_spieler: false },
  { name: 'Marco Richter', team_name: 'TSV Assamstadt', tore: 11, spiele: 15, ist_viktoria_spieler: false },
  { name: 'Kevin Hoffmann', team_name: 'Türkgücü Wertheim', tore: 8, spiele: 14, ist_viktoria_spieler: false },
  { name: 'Patrick Müller', team_name: 'TSV Tauberbischofsheim', tore: 6, spiele: 17, ist_viktoria_spieler: false },
  { name: 'Christian Weber', team_name: 'FV Brehmbachtal', tore: 6, spiele: 16, ist_viktoria_spieler: false }
];

async function addSampleData() {
  try {
    console.log('Adding sample teams...');
    
    // First, get existing teams to update them
    const existingTeamsResponse = await axios.get(`${API_BASE_URL}/teams`);
    const existingTeams = existingTeamsResponse.data || [];
    
    for (const teamData of sampleTeams) {
      try {
        // Check if team already exists
        const existingTeam = existingTeams.find(t => t.name === teamData.name);
        
        if (existingTeam) {
          // Update existing team
          console.log(`Updating team: ${teamData.name}`);
          await axios.put(`${API_BASE_URL}/teams/${existingTeam.id}`, {
            data: teamData
          });
        } else {
          // Create new team
          console.log(`Creating team: ${teamData.name}`);
          await axios.post(`${API_BASE_URL}/teams`, {
            data: teamData
          });
        }
      } catch (teamError) {
        console.error(`Error with team ${teamData.name}:`, teamError.response?.data || teamError.message);
        // Continue with next team
      }
    }
    
    console.log('Adding sample player statistics...');
    
    // Add player statistics
    for (const playerData of samplePlayerStats) {
      try {
        console.log(`Creating player stat: ${playerData.name}`);
        await axios.post(`${API_BASE_URL}/spieler-statistiks`, {
          data: playerData
        });
      } catch (playerError) {
        console.error(`Error with player ${playerData.name}:`, playerError.response?.data || playerError.message);
        // Continue with next player
      }
    }
    
    console.log('Sample data processing completed!');
    
  } catch (error) {
    console.error('General error:', error.response?.data || error.message);
  }
}

// Run the script
addSampleData();