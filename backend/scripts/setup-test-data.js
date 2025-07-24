/**
 * Script to set up test data for development
 * Run with: node scripts/setup-test-data.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:1337/api';

async function setupTestData() {
  console.log('🚀 Setting up test data...');
  
  try {
    // 1. Create Clubs
    console.log('📍 Creating clubs...');
    const clubs = [
      { name: 'SV Viktoria Wertheim' },
      { name: 'FC Eichel' },
      { name: 'TSV Assamstadt' },
      { name: 'Türkgücü Wertheim' },
      { name: 'TSV Tauberbischofsheim' }
    ];
    
    const createdClubs = [];
    for (const club of clubs) {
      try {
        const response = await axios.post(`${API_BASE}/clubs`, { data: club });
        createdClubs.push(response.data.data);
        console.log(`✅ Created club: ${club.name}`);
      } catch (error) {
        if (error.response?.status === 400 && error.response.data.error.message.includes('unique')) {
          console.log(`⚠️  Club already exists: ${club.name}`);
          // Try to find existing club
          const existing = await axios.get(`${API_BASE}/clubs?filters[name][$eq]=${encodeURIComponent(club.name)}`);
          if (existing.data.data.length > 0) {
            createdClubs.push(existing.data.data[0]);
          }
        } else {
          console.error(`❌ Error creating club ${club.name}:`, error.response?.data || error.message);
        }
      }
    }

    // 2. Create Saisons
    console.log('📅 Creating saisons...');
    const saisons = [
      { name: '2024/25', start_datum: '2024-08-01', end_datum: '2025-07-31' },
      { name: '2023/24', start_datum: '2023-08-01', end_datum: '2024-07-31' }
    ];
    
    const createdSaisons = [];
    for (const saison of saisons) {
      try {
        const response = await axios.post(`${API_BASE}/saisons`, { data: saison });
        createdSaisons.push(response.data.data);
        console.log(`✅ Created saison: ${saison.name}`);
      } catch (error) {
        if (error.response?.status === 400) {
          console.log(`⚠️  Saison already exists: ${saison.name}`);
          const existing = await axios.get(`${API_BASE}/saisons?filters[name][$eq]=${encodeURIComponent(saison.name)}`);
          if (existing.data.data.length > 0) {
            createdSaisons.push(existing.data.data[0]);
          }
        } else {
          console.error(`❌ Error creating saison ${saison.name}:`, error.response?.data || error.message);
        }
      }
    }

    // 3. Create Ligas
    console.log('🏆 Creating ligas...');
    const ligas = [
      { name: 'Kreisliga', kurz_name: 'KL', spieltage_gesamt: 30 },
      { name: 'Kreisklasse A', kurz_name: 'KKA', spieltage_gesamt: 26 },
      { name: 'Kreisklasse B', kurz_name: 'KKB', spieltage_gesamt: 22 }
    ];
    
    const createdLigas = [];
    for (const liga of ligas) {
      try {
        const response = await axios.post(`${API_BASE}/ligas`, { data: liga });
        createdLigas.push(response.data.data);
        console.log(`✅ Created liga: ${liga.name}`);
      } catch (error) {
        if (error.response?.status === 400) {
          console.log(`⚠️  Liga already exists: ${liga.name}`);
          const existing = await axios.get(`${API_BASE}/ligas?filters[name][$eq]=${encodeURIComponent(liga.name)}`);
          if (existing.data.data.length > 0) {
            createdLigas.push(existing.data.data[0]);
          }
        } else {
          console.error(`❌ Error creating liga ${liga.name}:`, error.response?.data || error.message);
        }
      }
    }

    // 4. Create Teams
    console.log('👥 Creating teams...');
    const teams = [
      { 
        name: '1. Mannschaft',
        altersklasse: 'Herren',
        status: 'aktiv',
        club: createdClubs.find(c => c.attributes.name === 'SV Viktoria Wertheim')?.id,
        liga: createdLigas.find(l => l.attributes.name === 'Kreisliga')?.id,
        saison: createdSaisons.find(s => s.attributes.name === '2024/25')?.id
      },
      { 
        name: '2. Mannschaft',
        altersklasse: 'Herren',
        status: 'aktiv',
        club: createdClubs.find(c => c.attributes.name === 'SV Viktoria Wertheim')?.id,
        liga: createdLigas.find(l => l.attributes.name === 'Kreisklasse A')?.id,
        saison: createdSaisons.find(s => s.attributes.name === '2024/25')?.id
      },
      { 
        name: '3. Mannschaft',
        altersklasse: 'Herren',
        status: 'aktiv',
        club: createdClubs.find(c => c.attributes.name === 'SV Viktoria Wertheim')?.id,
        liga: createdLigas.find(l => l.attributes.name === 'Kreisklasse B')?.id,
        saison: createdSaisons.find(s => s.attributes.name === '2024/25')?.id
      }
    ];
    
    const createdTeams = [];
    for (const team of teams) {
      try {
        const response = await axios.post(`${API_BASE}/teams`, { data: team });
        createdTeams.push(response.data.data);
        console.log(`✅ Created team: ${team.name}`);
      } catch (error) {
        if (error.response?.status === 400) {
          console.log(`⚠️  Team already exists: ${team.name}`);
          const existing = await axios.get(`${API_BASE}/teams?filters[name][$eq]=${encodeURIComponent(team.name)}`);
          if (existing.data.data.length > 0) {
            createdTeams.push(existing.data.data[0]);
          }
        } else {
          console.error(`❌ Error creating team ${team.name}:`, error.response?.data || error.message);
        }
      }
    }

    // 5. Create Sample Matches
    console.log('⚽ Creating sample matches...');
    const matches = [
      {
        datum: '2024-11-15T15:00:00.000Z',
        heimclub: createdClubs.find(c => c.attributes.name === 'SV Viktoria Wertheim')?.id,
        auswaertsclub: createdClubs.find(c => c.attributes.name === 'FC Eichel')?.id,
        unser_team: createdTeams.find(t => t.attributes.name === '1. Mannschaft')?.id,
        liga: createdLigas.find(l => l.attributes.name === 'Kreisliga')?.id,
        saison: createdSaisons.find(s => s.attributes.name === '2024/25')?.id,
        ist_heimspiel: true,
        status: 'beendet',
        tore_heim: 2,
        tore_auswaerts: 1,
        spielort: 'Viktoria-Stadion Wertheim',
        schiedsrichter: 'Hans Müller'
      },
      {
        datum: '2025-02-15T15:00:00.000Z',
        heimclub: createdClubs.find(c => c.attributes.name === 'TSV Assamstadt')?.id,
        auswaertsclub: createdClubs.find(c => c.attributes.name === 'SV Viktoria Wertheim')?.id,
        unser_team: createdTeams.find(t => t.attributes.name === '1. Mannschaft')?.id,
        liga: createdLigas.find(l => l.attributes.name === 'Kreisliga')?.id,
        saison: createdSaisons.find(s => s.attributes.name === '2024/25')?.id,
        ist_heimspiel: false,
        status: 'geplant',
        spielort: 'Sportplatz Assamstadt',
        schiedsrichter: 'Peter Schmidt'
      }
    ];
    
    for (const match of matches) {
      try {
        const response = await axios.post(`${API_BASE}/spiels`, { data: match });
        console.log(`✅ Created match: ${match.datum}`);
      } catch (error) {
        console.error(`❌ Error creating match:`, error.response?.data || error.message);
      }
    }

    console.log('🎉 Test data setup completed!');
    console.log('\n📋 Summary:');
    console.log(`- Clubs: ${createdClubs.length}`);
    console.log(`- Saisons: ${createdSaisons.length}`);
    console.log(`- Ligas: ${createdLigas.length}`);
    console.log(`- Teams: ${createdTeams.length}`);
    console.log('- Matches: 2 (1 past, 1 future)');
    
  } catch (error) {
    console.error('💥 Setup failed:', error.message);
  }
}

// Run the setup
setupTestData();