/**
 * Script to create league table entries for all clubs
 * Run with: node scripts/create-league-table.js
 * Make sure the backend is running on port 1337
 */

// League data
const leagueData = {
  name: "Kreisliga Tauberbischofsheim",
  kurz_name: "Kreisliga TBB",
  spieltage_gesamt: 30
};

// Table entries based on the screenshot (all teams have 0 games played)
const tableEntries = [
  { position: 1, clubName: "SV Viktoria Wertheim" },
  { position: 2, clubName: "VfR Gerlachsheim" },
  { position: 3, clubName: "TSV Jahn Kreuzwertheim" },
  { position: 4, clubName: "TSV Assamstadt" },
  { position: 5, clubName: "FV Brehmbachtal" },
  { position: 6, clubName: "FC Hundheim-Steinbach" },
  { position: 7, clubName: "VfL Großrinderfeld" },
  { position: 8, clubName: "Türk Gücü Wertheim" },
  { position: 9, clubName: "SV Pülfringen" },
  { position: 10, clubName: "VfB Reicholzheim" },
  { position: 11, clubName: "FC Rauenberg" },
  { position: 12, clubName: "SV Schönfeld" },
  { position: 13, clubName: "TSG Impfingen II" },
  { position: 14, clubName: "1. FC Umpfertal" },
  { position: 15, clubName: "Kickers DHK Wertheim" },
  { position: 16, clubName: "TSV Schwabhausen 1946" }
];

async function createLeagueTable() {
  console.log('Starting to create league table...');
  
  try {
    // Step 1: Create or get the league
    console.log('📋 Creating league...');
    
    // Check if league already exists
    const leagueCheckResponse = await fetch(`http://localhost:1337/api/ligas?filters[name][$eq]=${encodeURIComponent(leagueData.name)}`);
    let leagueId;
    
    if (leagueCheckResponse.ok) {
      const existingLeagues = await leagueCheckResponse.json();
      if (existingLeagues.data && existingLeagues.data.length > 0) {
        leagueId = existingLeagues.data[0].id;
        console.log(`✅ League already exists: ${leagueData.name} (ID: ${leagueId})`);
      }
    }
    
    if (!leagueId) {
      const leagueResponse = await fetch('http://localhost:1337/api/ligas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: leagueData
        })
      });

      if (leagueResponse.ok) {
        const leagueResult = await leagueResponse.json();
        leagueId = leagueResult.data.id;
        console.log(`✅ Created league: ${leagueData.name} (ID: ${leagueId})`);
      } else {
        const error = await leagueResponse.text();
        throw new Error(`Failed to create league: ${error}`);
      }
    }

    // Step 2: Get all clubs
    console.log('🏟️  Fetching clubs...');
    const clubsResponse = await fetch('http://localhost:1337/api/clubs');
    
    if (!clubsResponse.ok) {
      throw new Error('Failed to fetch clubs');
    }
    
    const clubsData = await clubsResponse.json();
    const clubs = clubsData.data;
    console.log(`📊 Found ${clubs.length} clubs`);

    // Step 3: Create table entries
    console.log('📈 Creating table entries...');
    
    for (const entry of tableEntries) {
      try {
        // Find the club by name
        const club = clubs.find(c => c.name === entry.clubName);
        
        if (!club) {
          console.log(`⚠️  Club not found: ${entry.clubName}`);
          continue;
        }

        // Check if table entry already exists
        const existingEntryResponse = await fetch(
          `http://localhost:1337/api/tabellen-eintraege?filters[liga][id][$eq]=${leagueId}&filters[club][id][$eq]=${club.id}`
        );
        
        if (existingEntryResponse.ok) {
          const existingEntries = await existingEntryResponse.json();
          if (existingEntries.data && existingEntries.data.length > 0) {
            console.log(`⚠️  Table entry already exists: ${entry.clubName}`);
            continue;
          }
        }

        // Create table entry (all teams start with 0 games, 0 points as per screenshot)
        // Use simple numeric IDs for relations
        const tableEntryData = {
          liga: leagueId,
          club: club.id,
          platz: entry.position,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0
        };

        const entryResponse = await fetch('http://localhost:1337/api/tabellen-eintraege', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: tableEntryData
          })
        });

        if (entryResponse.ok) {
          const result = await entryResponse.json();
          console.log(`✅ Created table entry: ${entry.position}. ${entry.clubName}`);
        } else {
          const error = await entryResponse.text();
          console.log(`❌ Failed to create table entry for ${entry.clubName}: ${error}`);
        }
      } catch (error) {
        console.log(`❌ Error creating table entry for ${entry.clubName}:`, error.message);
      }
    }
    
    console.log('🎉 League table creation completed!');
    
    // Show summary
    try {
      const summaryResponse = await fetch(`http://localhost:1337/api/tabellen-eintraege?filters[liga][id][$eq]=${leagueId}&populate=club`);
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        console.log(`📊 Total table entries created: ${summaryData.data.length}`);
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
  createLeagueTable();
}

module.exports = { createLeagueTable };