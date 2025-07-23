/**
 * Script to add opposing clubs using HTTP API
 * Run with: node scripts/add-clubs-strapi.js
 * Make sure the backend is running on port 1337
 */

const clubs = [
  {
    name: "SV Viktoria Wertheim",
    kurz_name: "SV Viktoria",
    ist_unser_verein: true,
    vereinsfarben: "Rot/Weiß"
  },
  {
    name: "VfR Gerlachsheim",
    kurz_name: "VfR Gerlachsheim",
    ist_unser_verein: false
  },
  {
    name: "TSV Jahn Kreuzwertheim",
    kurz_name: "TSV Jahn",
    ist_unser_verein: false
  },
  {
    name: "TSV Assamstadt",
    kurz_name: "TSV Assamstadt",
    ist_unser_verein: false
  },
  {
    name: "FV Brehmbachtal",
    kurz_name: "FV Brehmbachtal",
    ist_unser_verein: false
  },
  {
    name: "FC Hundheim-Steinbach",
    kurz_name: "FC Hundheim",
    ist_unser_verein: false
  },
  {
    name: "VfL Großrinderfeld",
    kurz_name: "VfL Großrinderfeld",
    ist_unser_verein: false
  },
  {
    name: "Türk Gücü Wertheim",
    kurz_name: "Türk Gücü",
    ist_unser_verein: false
  },
  {
    name: "SV Pülfringen",
    kurz_name: "SV Pülfringen",
    ist_unser_verein: false
  },
  {
    name: "VfB Reicholzheim",
    kurz_name: "VfB Reicholzheim",
    ist_unser_verein: false
  },
  {
    name: "FC Rauenberg",
    kurz_name: "FC Rauenberg",
    ist_unser_verein: false
  },
  {
    name: "SV Schönfeld",
    kurz_name: "SV Schönfeld",
    ist_unser_verein: false
  },
  {
    name: "TSG Impfingen II",
    kurz_name: "TSG Impfingen II",
    ist_unser_verein: false
  },
  {
    name: "1. FC Umpfertal",
    kurz_name: "FC Umpfertal",
    ist_unser_verein: false
  },
  {
    name: "Kickers DHK Wertheim",
    kurz_name: "Kickers DHK",
    ist_unser_verein: false
  },
  {
    name: "TSV Schwabhausen 1946",
    kurz_name: "TSV Schwabhausen",
    ist_unser_verein: false
  }
];

async function addClubs() {
  console.log('Starting to add clubs via HTTP API...');
  
  try {
    for (const clubData of clubs) {
      try {
        // Check if club already exists
        const checkResponse = await fetch(`http://localhost:1337/api/clubs?filters[name][$eq]=${encodeURIComponent(clubData.name)}`);
        
        if (checkResponse.ok) {
          const existingData = await checkResponse.json();
          if (existingData.data && existingData.data.length > 0) {
            console.log(`⚠️  Club already exists: ${clubData.name}`);
            continue;
          }
        }

        // Create new club
        const response = await fetch('http://localhost:1337/api/clubs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: clubData
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Added: ${clubData.name} (ID: ${result.data.id})`);
        } else {
          const error = await response.text();
          console.log(`❌ Failed to add ${clubData.name}: ${error}`);
        }
      } catch (error) {
        console.log(`❌ Error adding ${clubData.name}:`, error.message);
      }
    }
    
    console.log('Finished adding clubs!');
    
    // Show summary
    try {
      const summaryResponse = await fetch('http://localhost:1337/api/clubs');
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        console.log(`📊 Total clubs in database: ${summaryData.data.length}`);
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
  addClubs();
}

module.exports = { clubs, addClubs };