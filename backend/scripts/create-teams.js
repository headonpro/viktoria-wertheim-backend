/**
 * Script to create Team entries for SV Viktoria Wertheim
 * This script creates the three teams (1., 2., 3. Mannschaft) with sample data
 */

const API_BASE_URL = 'http://localhost:1337';

// Sample team data matching what the frontend expects
const teamsData = [
  {
    name: '1. Mannschaft',
    liga_name: 'Kreisliga',
    liga_vollname: 'Kreisliga Tauber-Bischofsheim',
    trainer: 'Max Mustermann',
    co_trainer: 'Hans Schmidt',
    altersklasse: 'Herren',
    heimspieltag: 'Sonntag',
    trainingszeiten: 'Dienstag 19:00-20:30, Donnerstag 19:00-20:30',
    tabellenplatz: 8,
    punkte: 24,
    spiele_gesamt: 18,
    siege: 7,
    unentschieden: 3,
    niederlagen: 8,
    tore_fuer: 32,
    tore_gegen: 28,
    tordifferenz: 4,
    form_letzte_5: ['S', 'N', 'U', 'S', 'N'],
    trend: 'gleich',
    status: 'aktiv'
  },
  {
    name: '2. Mannschaft',
    liga_name: 'Kreisklasse A',
    liga_vollname: 'Kreisklasse A Tauber-Bischofsheim',
    trainer: 'Peter Müller',
    co_trainer: 'Klaus Weber',
    altersklasse: 'Herren',
    heimspieltag: 'Samstag',
    trainingszeiten: 'Montag 19:00-20:30, Mittwoch 19:00-20:30',
    tabellenplatz: 5,
    punkte: 28,
    spiele_gesamt: 16,
    siege: 9,
    unentschieden: 1,
    niederlagen: 6,
    tore_fuer: 35,
    tore_gegen: 22,
    tordifferenz: 13,
    form_letzte_5: ['S', 'S', 'U', 'S', 'N'],
    trend: 'steigend',
    status: 'aktiv'
  },
  {
    name: '3. Mannschaft',
    liga_name: 'Kreisklasse B',
    liga_vollname: 'Kreisklasse B Tauber-Bischofsheim',
    trainer: 'Stefan Fischer',
    altersklasse: 'Herren',
    heimspieltag: 'Samstag',
    trainingszeiten: 'Freitag 19:00-20:30',
    tabellenplatz: 12,
    punkte: 15,
    spiele_gesamt: 14,
    siege: 4,
    unentschieden: 3,
    niederlagen: 7,
    tore_fuer: 18,
    tore_gegen: 31,
    tordifferenz: -13,
    form_letzte_5: ['N', 'N', 'U', 'N', 'S'],
    trend: 'fallend',
    status: 'aktiv'
  }
];

async function createTeams() {
  console.log('🚀 Starting to create Teams...');
  
  try {
    for (const teamData of teamsData) {
      console.log(`\n📝 Creating ${teamData.name}...`);
      
      // Check if team already exists
      const checkUrl = new URL(`${API_BASE_URL}/api/teams`);
      checkUrl.searchParams.append('filters[name][$eq]', teamData.name);
      
      const existingResponse = await fetch(checkUrl.toString());
      const existingData = await existingResponse.json();
      
      if (existingData.data && existingData.data.length > 0) {
        console.log(`   ⚠️  ${teamData.name} already exists, updating...`);
        
        // Update existing team
        const existingId = existingData.data[0].id;
        const updateResponse = await fetch(`${API_BASE_URL}/api/teams/${existingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: teamData
          })
        });
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.text();
          throw new Error(`HTTP error! status: ${updateResponse.status}, response: ${errorData}`);
        }
        
        console.log(`   ✅ Updated ${teamData.name}`);
      } else {
        // Create new team
        const createResponse = await fetch(`${API_BASE_URL}/api/teams`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: teamData
          })
        });
        
        if (!createResponse.ok) {
          const errorData = await createResponse.text();
          throw new Error(`HTTP error! status: ${createResponse.status}, response: ${errorData}`);
        }
        
        const responseData = await createResponse.json();
        console.log(`   ✅ Created ${teamData.name} with ID: ${responseData.data.id}`);
      }
    }
    
    console.log('\n🎉 All Teams created successfully!');
    console.log('\n📊 Summary:');
    console.log('   • 1. Mannschaft - Kreisliga (Platz 8)');
    console.log('   • 2. Mannschaft - Kreisklasse A (Platz 5)');
    console.log('   • 3. Mannschaft - Kreisklasse B (Platz 12)');
    
  } catch (error) {
    console.error('❌ Error creating Teams:', error.message);
    console.error('\n💡 Make sure the Strapi backend is running:');
    console.error('   cd backend && npm run develop');
    process.exit(1);
  }
}

// Run the script
createTeams();