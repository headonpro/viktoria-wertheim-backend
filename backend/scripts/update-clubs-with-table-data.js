/**
 * Script to update existing clubs with table data
 * Run with: node scripts/update-clubs-with-table-data.js
 * Make sure the backend is running on port 1337
 */

// Table data based on the screenshot (all teams have 0 games played)
const tableData = [
  { clubName: "SV Viktoria Wertheim", platz: 1 },
  { clubName: "VfR Gerlachsheim", platz: 2 },
  { clubName: "TSV Jahn Kreuzwertheim", platz: 3 },
  { clubName: "TSV Assamstadt", platz: 4 },
  { clubName: "FV Brehmbachtal", platz: 5 },
  { clubName: "FC Hundheim-Steinbach", platz: 6 },
  { clubName: "VfL Großrinderfeld", platz: 7 },
  { clubName: "Türk Gücü Wertheim", platz: 8 },
  { clubName: "SV Pülfringen", platz: 9 },
  { clubName: "VfB Reicholzheim", platz: 10 },
  { clubName: "FC Rauenberg", platz: 11 },
  { clubName: "SV Schönfeld", platz: 12 },
  { clubName: "TSG Impfingen II", platz: 13 },
  { clubName: "1. FC Umpfertal", platz: 14 },
  { clubName: "Kickers DHK Wertheim", platz: 15 },
  { clubName: "TSV Schwabhausen 1946", platz: 16 }
];

async function updateClubsWithTableData() {
  console.log('Starting to update clubs with table data...');
  
  try {
    // Get all clubs
    console.log('🏟️  Fetching clubs...');
    const clubsResponse = await fetch('http://localhost:1337/api/clubs');
    
    if (!clubsResponse.ok) {
      throw new Error('Failed to fetch clubs');
    }
    
    const clubsData = await clubsResponse.json();
    const clubs = clubsData.data;
    console.log(`📊 Found ${clubs.length} clubs`);

    // Update each club with table data
    console.log('📈 Updating clubs with table data...');
    
    for (const entry of tableData) {
      try {
        // Find the club by name
        const club = clubs.find(c => c.name === entry.clubName);
        
        if (!club) {
          console.log(`⚠️  Club not found: ${entry.clubName}`);
          continue;
        }

        // Update club with table data (all teams start with 0 games, 0 points as per screenshot)
        const updateData = {
          liga: "Kreisliga Tauberbischofsheim",
          platz: entry.platz,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0
        };

        const updateResponse = await fetch(`http://localhost:1337/api/clubs/${club.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: updateData
          })
        });

        if (updateResponse.ok) {
          const result = await updateResponse.json();
          console.log(`✅ Updated: ${entry.platz}. ${entry.clubName}`);
        } else {
          const error = await updateResponse.text();
          console.log(`❌ Failed to update ${entry.clubName}: ${error}`);
        }
      } catch (error) {
        console.log(`❌ Error updating ${entry.clubName}:`, error.message);
      }
    }
    
    console.log('🎉 Club updates completed!');
    
    // Show summary
    try {
      const summaryResponse = await fetch('http://localhost:1337/api/clubs?sort=platz:asc');
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        console.log(`📊 Updated clubs with table positions:`);
        summaryData.data.forEach(club => {
          if (club.platz) {
            console.log(`   ${club.platz}. ${club.name}`);
          }
        });
      }
    } catch (error) {
      console.log('Could not fetch summary');
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

// Check if we're running this script directly
if (require.main === module) {
  updateClubsWithTableData();
}

module.exports = { updateClubsWithTableData };