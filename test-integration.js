const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function testIntegration() {
  console.log('Testing frontend integration with simplified backend...\n');

  // Test 1: TeamStatus component - fetch team data
  console.log('1. Testing TeamStatus component integration:');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/teams`, {
      params: {
        'filters[name][$eq]': '1. Mannschaft',
        'populate': {
          liga: true,
          saison: true
        }
      }
    });

    if (response.data && response.data.length > 0) {
      const team = response.data[0];
      console.log('✓ Team data found:', {
        name: team.name,
        liga: team.liga?.name || 'No liga',
        tabellenplatz: team.tabellenplatz,
        punkte: team.punkte,
        trainer: team.trainer
      });
    } else {
      console.log('✗ No team data found');
    }
  } catch (error) {
    console.log('✗ Error fetching team data:', error.message);
  }

  // Test 2: LeagueTable component - fetch tabellen-eintraege
  console.log('\n2. Testing LeagueTable component integration:');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
      params: {
        sort: 'platz:asc',
        'pagination[pageSize]': 10,
        'populate': {
          team: {
            populate: ['teamfoto']
          },
          liga: true
        }
      }
    });

    console.log('✓ Table entries found:', response.data.data.length);
    if (response.data.data.length === 0) {
      console.log('  Note: No table entries in database - this is expected for simplified backend');
    }
  } catch (error) {
    console.log('✗ Error fetching table data:', error.message);
  }

  // Test 3: GameCards component - fetch game cards
  console.log('\n3. Testing GameCards component integration:');
  try {
    const [lastResponse, nextResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/api/game-cards`),
      axios.get(`${API_BASE_URL}/api/next-game-cards`, {
        params: {
          'populate': 'gegner_team'
        }
      })
    ]);

    const lastGame = lastResponse.data?.data?.[0];
    const nextGame = nextResponse.data?.data?.[0];

    console.log('✓ Last game:', lastGame ? {
      gegner: lastGame.gegner,
      datum: lastGame.datum,
      unsere_tore: lastGame.unsere_tore,
      gegner_tore: lastGame.gegner_tore,
      ist_heimspiel: lastGame.ist_heimspiel
    } : 'None');

    console.log('✓ Next game:', nextGame ? {
      gegner_team: nextGame.gegner_team?.name || 'No team relation',
      datum: nextGame.datum,
      ist_heimspiel: nextGame.ist_heimspiel
    } : 'None');
  } catch (error) {
    console.log('✗ Error fetching game data:', error.message);
  }

  // Test 4: NewsTicker component - fetch news
  console.log('\n4. Testing NewsTicker component integration:');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/news-artikels`, {
      params: {
        sort: 'datum:desc',
        'pagination[limit]': 3
      }
    });

    console.log('✓ News articles found:', response.data.data.length);
    if (response.data.data.length > 0) {
      console.log('  First article:', {
        titel: response.data.data[0].titel,
        autor: response.data.data[0].autor,
        datum: response.data.data[0].datum
      });
    }
  } catch (error) {
    console.log('✗ Error fetching news data:', error.message);
  }

  console.log('\n✅ Integration test completed!');
}

testIntegration().catch(console.error);