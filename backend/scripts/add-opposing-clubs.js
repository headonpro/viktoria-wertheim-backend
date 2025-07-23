/**
 * Script to add opposing clubs from the league table
 * Run with: node scripts/add-opposing-clubs.js
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
  try {
    console.log('Starting to add clubs...');
    
    for (const club of clubs) {
      try {
        const response = await fetch('http://localhost:1337/api/clubs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: club
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Added: ${club.name}`);
        } else {
          const error = await response.text();
          console.log(`❌ Failed to add ${club.name}: ${error}`);
        }
      } catch (error) {
        console.log(`❌ Error adding ${club.name}:`, error.message);
      }
    }
    
    console.log('Finished adding clubs!');
  } catch (error) {
    console.error('Script error:', error);
  }
}

// Check if we're running this script directly
if (require.main === module) {
  addClubs();
}

module.exports = { clubs, addClubs };